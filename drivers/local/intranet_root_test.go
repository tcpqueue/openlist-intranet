package local

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIntranetRootBoundary(t *testing.T) {
	base := t.TempDir()
	outside := t.TempDir()
	secret := filepath.Join(outside, "secret")
	if err := os.WriteFile(secret, []byte("unchanged"), 0600); err != nil {
		t.Fatal(err)
	}
	d := &Local{}
	d.RootFolderPath = base
	if err := os.Symlink(outside, filepath.Join(base, "escape")); err != nil {
		t.Skip(err)
	}
	escaped := filepath.Join(base, "escape", "secret")
	if f, e := d.safeOpen(escaped); e == nil {
		f.Close()
		t.Fatal("read escaped storage")
	}
	if f, e := d.safeCreate(escaped); e == nil {
		f.Close()
		t.Fatal("write escaped storage")
	}
	if e := d.safeRemove(escaped); e == nil {
		t.Fatal("delete escaped storage")
	}
	if e := d.safeMkdirAll(filepath.Join(base, "escape", "new"), 0700); e == nil {
		t.Fatal("mkdir escaped storage")
	}
	if e := d.safeRename(secret, filepath.Join(base, "stolen")); e == nil {
		t.Fatal("rename escaped storage")
	}
	b, e := os.ReadFile(secret)
	if e != nil || string(b) != "unchanged" {
		t.Fatal("outside file altered")
	}
	regular := filepath.Join(base, "normal")
	f, e := d.safeCreate(regular)
	if e != nil {
		t.Fatal(e)
	}
	f.WriteString("ok")
	f.Close()
	if e = d.safeRename(regular, filepath.Join(base, "renamed")); e != nil {
		t.Fatal(e)
	}
	if e = d.safeRemove(filepath.Join(base, "renamed")); e != nil {
		t.Fatal(e)
	}
}
