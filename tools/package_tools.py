"""GPL-3.0: local source preparation and packaging; never contacts a server."""
import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(root, name):
    return json.loads((root / name).read_text(encoding="utf-8"))


def safe_path(base, relative):
    """Reject traversal, drive paths and symlinks escaping the selected directory."""
    if not isinstance(relative, str) or "\\" in relative or ":" in relative:
        raise ValueError("清单包含非法路径")
    p = PurePosixPath(relative)
    if p.is_absolute() or not p.parts or any(v in {".", ".."} for v in p.parts):
        raise ValueError("清单包含越界路径")
    base = base.resolve()
    target = (base / relative).resolve()
    if not target.is_relative_to(base) or target == base:
        raise ValueError("路径越出指定目录")
    return target


def verify_file(path, item, with_digest=False):
    if not path.is_file() or path.stat().st_size != item["bytes"]:
        raise ValueError("文件缺失或大小不符：" + item["path"])
    if with_digest and digest(path) != item["sha256"]:
        raise ValueError("文件内容与对应版本不符：" + item["path"])


def copy_new(source, target, link=False):
    """Exclusive creation: existing files and player databases are never overwritten."""
    target.parent.mkdir(parents=True, exist_ok=True)
    if link:
        os.link(source, target)
        return
    created = False
    try:
        with target.open("xb") as out:
            created = True
            with source.open("rb") as inp:
                shutil.copyfileobj(inp, out, 1024 * 1024)
        shutil.copystat(source, target)
    except BaseException:
        if created:
            target.unlink(missing_ok=True)
        raise


def seed_check(root):
    manifest = load(root, "source-manifest.json")
    stats = {}
    for entry in manifest["initialData"]:
        path = safe_path(root, entry["path"])
        verify_file(path, entry, True)
        db = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
        try:
            counts = {name: db.execute('SELECT count(*) FROM "' + name + '"').fetchone()[0]
                      for name, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
            if counts != entry["tables"]:
                raise ValueError("初始资料的表记录数与清单不符")
            if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("初始数据库完整性失败")
            if db.execute("PRAGMA freelist_count").fetchone()[0] != 0:
                raise ValueError("初始数据库仍含未整理的空闲页")
            if entry["module"] == "module-03":
                assert all(counts[k] == 0 for k in ["history", "matches", "events"])
                state = json.loads(db.execute("SELECT value FROM state WHERE id=1").fetchone()[0])
                assert not state.get("studioRuntime")
            if entry["module"] == "module-04":
                assert all(counts[k] == 0 for k in ["secret", "jobs", "games", "calls"])
                state = json.loads(db.execute("SELECT value FROM personal WHERE id=1").fetchone()[0])
                assert not state["config"].get("saveKey")
                assert not any(state["config"].get(k) for k in ["key", "apiKey", "token", "password"])
                stats["DIY"] = len(state["diy"])
                stats["publishedDIY"] = sum(bool(v.get("published")) for v in state["diy"])
            stats[entry["module"]] = counts
        finally:
            db.close()
    return stats


def source_check(root):
    manifest = load(root, "source-manifest.json")
    for entry in manifest["files"]:
        verify_file(safe_path(root, entry["path"]), entry, True)
    return {"sourceFiles": len(manifest["files"]), "data": seed_check(root)}


def prepare(root, portable, link=False):
    portable = portable.resolve()
    package = (root / "package").resolve()
    if portable == package or portable.is_relative_to(root.resolve()):
        raise ValueError("请选择仓库目录以外的已解压便携包")
    if not (portable / "app/server.py").is_file():
        raise ValueError("请选择含 app、module-01 和 .runtime 的便携包根目录")
    seed_check(root)
    resources = load(root, "resource-manifest.json")["files"]
    tasks = []
    # Validate every source and existing target before doing any writes.
    for entry in resources:
        source = safe_path(portable, entry["path"])
        target = safe_path(package, entry["path"])
        verify_file(source, entry)
        if target.exists():
            verify_file(target, entry)
        else:
            tasks.append((source, target))
    resource_tasks = len(tasks)
    for entry in load(root, "source-manifest.json")["initialData"]:
        source = safe_path(root, entry["path"])
        target = safe_path(package, entry["target"])
        if not target.exists():
            tasks.append((source, target))
    last = time.monotonic()
    for n, (source, target) in enumerate(tasks, 1):
        # Never link databases: the application must not mutate the immutable seed.
        copy_new(source, target, link and source.suffix != ".sqlite")
        if time.monotonic() - last > 10:
            print(f"补齐资源 {n}/{len(tasks)}", flush=True)
            last = time.monotonic()
    return {"copied": len(tasks), "existingResources": len(resources) - resource_tasks, "codeOverwritten": 0}


def ready_check(root):
    package = root / "package"
    for item in load(root, "resource-manifest.json")["files"]:
        verify_file(safe_path(package, item["path"]), item)
    for item in load(root, "source-manifest.json")["initialData"]:
        if not safe_path(package, item["target"]).is_file():
            raise ValueError("请先初始化本机资料：" + item["target"])
    return {"resources": len(load(root, "resource-manifest.json")["files"]),
            "initializedData": len(load(root, "source-manifest.json")["initialData"])}


def build(root, destination):
    """Create a fresh directory release using source + resources + immutable seeds."""
    root = root.resolve()
    destination = destination.resolve()
    if destination == root or destination.is_relative_to(root) or root.is_relative_to(destination):
        raise ValueError("发行目标须为源码目录以外的新目录")
    if destination.exists():
        raise ValueError("发行目标已存在；请选择新目录，不覆盖或清理旧数据")
    seed_check(root)
    manifest = load(root, "source-manifest.json")
    entries = []
    for entry in manifest["files"]:
        if entry["path"].startswith("package/"):
            src = safe_path(root, entry["path"])
            if not src.is_file():
                raise ValueError("缺少源码：" + entry["path"])
            entries.append((src, safe_path(destination, entry["path"][len("package/"):])))
    for entry in load(root, "resource-manifest.json")["files"]:
        src = safe_path(root / "package", entry["path"])
        verify_file(src, entry)
        entries.append((src, safe_path(destination, entry["path"])))
    for entry in manifest["initialData"]:
        entries.append((safe_path(root, entry["path"]), safe_path(destination, entry["target"])))
    # README.md and readme.md cannot coexist on Windows. Keep the maintenance text,
    # and place the public README under a distinct name in the directory release.
    for name in ["README.md", "NOTICE.md", "LICENSE", "VERSION"]:
        entries.append((root / name, destination / ("README-PUBLIC.md" if name == "README.md" else name)))
    destination.mkdir(parents=True)
    last = time.monotonic()
    for n, (src, dst) in enumerate(entries, 1):
        copy_new(src, dst)
        if time.monotonic() - last > 10:
            print(f"整理发行目录 {n}/{len(entries)}", flush=True)
            last = time.monotonic()
    return {"files": len(entries), "initialDataUsed": True, "gameHistoryExported": False}


def main():
    ap = argparse.ArgumentParser(description="本地源码准备与发行工具；不上传、不下载、不覆盖已有资料")
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("--from-portable", type=Path, required=True)
    p.add_argument("--link-resources", action="store_true", help="仅同盘本地测试可选；资源硬链接，数据库仍复制")
    p = sub.add_parser("check")
    p.add_argument("--ready", action="store_true")
    p = sub.add_parser("build")
    p.add_argument("--destination", type=Path, required=True)
    args = ap.parse_args()
    try:
        if args.command == "prepare":
            result = prepare(ROOT, args.from_portable, args.link_resources)
        elif args.command == "build":
            result = build(ROOT, args.destination)
        else:
            result = source_check(ROOT)
            if args.ready:
                result["ready"] = ready_check(ROOT)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, AssertionError, sqlite3.Error) as e:
        print("检查未通过：" + str(e), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
