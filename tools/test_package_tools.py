"""GPL-3.0: tests for preparation safety and persistent player data."""
import hashlib
import importlib.util
import json
import sqlite3
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("package_tools", Path(__file__).with_name("package_tools.py"))
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.repo = self.base / "repo"
        self.portable = self.base / "portable"
        for p in [self.repo / "package", self.portable / "app"]:
            p.mkdir(parents=True)
        (self.portable / "app/server.py").write_text("# fixture")
        (self.portable / "image.jpg").write_bytes(b"asset")
        self.seed = self.repo / "seed.sqlite"
        db = sqlite3.connect(self.seed)
        db.execute("create table revisions(revision integer primary key, state text)")
        db.execute("insert into revisions values(1, '{}')")
        db.commit()
        db.execute("VACUUM")
        db.close()
        self.manifest = {"files": [], "initialData": [{"path": "seed.sqlite", "module": "module-02", "target": "module-02/data/wiki.sqlite", "bytes": self.seed.stat().st_size, "sha256": tool.digest(self.seed), "tables": {"revisions": 1}}]}
        self.resources = {"files": [{"path": "image.jpg", "bytes": 5}]}
        self.save()

    def save(self):
        (self.repo / "source-manifest.json").write_text(json.dumps(self.manifest))
        (self.repo / "resource-manifest.json").write_text(json.dumps(self.resources))

    def test_copy_and_idempotence(self):
        result = tool.prepare(self.repo, self.portable)
        self.assertEqual(result["copied"], 2)
        self.assertEqual((self.repo / "package/image.jpg").read_bytes(), b"asset")
        self.assertEqual(tool.prepare(self.repo, self.portable)["copied"], 0)

    def test_does_not_overwrite_source_or_existing_player_data(self):
        code = self.repo / "package/app/server.py"
        code.parent.mkdir(parents=True)
        code.write_text("local edit")
        target = self.repo / "package/module-02/data/wiki.sqlite"
        target.parent.mkdir(parents=True)
        target.write_bytes(b"existing player data")
        tool.prepare(self.repo, self.portable)
        self.assertEqual(code.read_text(), "local edit")
        self.assertEqual(target.read_bytes(), b"existing player data")

    def test_missing_resource_fails_before_copy(self):
        self.resources["files"].append({"path": "missing.jpg", "bytes": 5})
        self.save()
        with self.assertRaises(ValueError):
            tool.prepare(self.repo, self.portable)
        self.assertFalse((self.repo / "package/image.jpg").exists())

    def test_resource_conflict_not_overwritten(self):
        target = self.repo / "package/image.jpg"
        target.write_bytes(b"different local image")
        with self.assertRaises(ValueError):
            tool.prepare(self.repo, self.portable)
        self.assertEqual(target.read_bytes(), b"different local image")

    def test_malformed_paths_rejected(self):
        for path in ["../escape", "/absolute", "C:/Users/file", "folder\\file"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                tool.safe_path(self.repo, path)

    def test_symlink_escape_rejected(self):
        link = self.repo / "outside"
        try:
            link.symlink_to(self.portable, target_is_directory=True)
        except OSError:
            if __import__('os').name != 'nt':
                raise
            result = subprocess.run(['cmd.exe', '/d', '/c', 'mklink', '/J', str(link), str(self.portable)], capture_output=True)
            if result.returncode:
                self.skipTest("当前用户无法创建符号链接或目录联接")
        with self.assertRaises(ValueError):
            tool.safe_path(self.repo, "outside/image.jpg")

    def test_seed_tampering_rejected(self):
        self.seed.write_bytes(b"not a database")
        with self.assertRaises(ValueError):
            tool.prepare(self.repo, self.portable)

    def test_export_refuses_existing_directory(self):
        existing = self.base / "existing"
        existing.mkdir()
        with self.assertRaises(ValueError):
            tool.build(self.repo, existing)
        self.assertTrue(existing.is_dir())

    def test_export_uses_seed_instead_of_player_history(self):
        tool.prepare(self.repo, self.portable)
        target = self.repo / "package/module-02/data/wiki.sqlite"
        target.write_bytes(b"private game history")
        code = self.repo / "package/example.py"
        code.write_text("# current source")
        self.manifest["files"] = [{"path": "package/example.py", "bytes": code.stat().st_size, "sha256": tool.digest(code)}]
        self.save()
        for name in ["README.md", "NOTICE.md", "LICENSE", "VERSION"]:
            (self.repo / name).write_text("fixture")
        destination = self.base / "new-release"
        tool.build(self.repo, destination)
        self.assertEqual(tool.digest(destination / "module-02/data/wiki.sqlite"), tool.digest(self.seed))
        self.assertEqual((destination / "example.py").read_text(), "# current source")
        self.assertFalse((destination / "README.md").exists())
        self.assertTrue((destination / "README-PUBLIC.md").is_file())


if __name__ == "__main__":
    unittest.main()
