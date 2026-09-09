package bootstrap

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIntranetPresetDirectory(t *testing.T) {
	p := filepath.Join(t.TempDir(), "files")
	if err := ensureDefaultFolder(p); err != nil {
		t.Fatal(err)
	}
	if err := ensureDefaultFolder(p); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(t.TempDir(), "link")
	if err := os.Symlink(p, link); err != nil {
		t.Fatal(err)
	}
	if err := ensureDefaultFolder(link); err == nil {
		t.Fatal("symlink accepted")
	}
	if err := os.Chmod(p, 0777); err != nil {
		t.Fatal(err)
	}
	if err := ensureDefaultFolder(p); err == nil {
		t.Fatal("public writable directory accepted")
	}
}
