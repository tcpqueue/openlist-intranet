package local

import (
	"fmt"
	"os"
	"path/filepath"
)

// Use directory-relative OS operations, including their symlink-race protection.
func (d *Local) rootPath(path string) (*os.Root, string, error) {
	base, err := filepath.Abs(d.GetRootPath())
	if err != nil {
		return nil, "", err
	}
	relative, err := filepath.Rel(base, path)
	if err != nil || (relative != "." && !filepath.IsLocal(relative)) {
		return nil, "", fmt.Errorf("path outside storage root")
	}
	r, err := os.OpenRoot(base)
	return r, relative, err
}
func (d *Local) safeOpen(path string) (*os.File, error) {
	r, n, e := d.rootPath(path)
	if e != nil {
		return nil, e
	}
	defer r.Close()
	return r.Open(n)
}
func (d *Local) safeCreate(path string) (*os.File, error) {
	r, n, e := d.rootPath(path)
	if e != nil {
		return nil, e
	}
	defer r.Close()
	return r.OpenFile(n, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
}
func (d *Local) safeStat(path string) (os.FileInfo, error) {
	r, n, e := d.rootPath(path)
	if e != nil {
		return nil, e
	}
	defer r.Close()
	return r.Stat(n)
}
func (d *Local) safeReadDir(path string) ([]os.FileInfo, error) {
	f, e := d.safeOpen(path)
	if e != nil {
		return nil, e
	}
	defer f.Close()
	return f.Readdir(-1)
}
func (d *Local) safeMkdirAll(path string, mode os.FileMode) error {
	r, n, e := d.rootPath(path)
	if e != nil {
		return e
	}
	defer r.Close()
	return r.MkdirAll(n, mode)
}
func (d *Local) safeRemove(path string) error {
	r, n, e := d.rootPath(path)
	if e != nil {
		return e
	}
	defer r.Close()
	if n == "." {
		return fmt.Errorf("cannot remove storage root")
	}
	return r.Remove(n)
}
func (d *Local) safeRemoveAll(path string) error {
	r, n, e := d.rootPath(path)
	if e != nil {
		return e
	}
	defer r.Close()
	if n == "." {
		return fmt.Errorf("cannot remove storage root")
	}
	return r.RemoveAll(n)
}
func (d *Local) safeRename(source, dest string) error {
	r, n, e := d.rootPath(source)
	if e != nil {
		return e
	}
	defer r.Close()
	base, e := filepath.Abs(d.GetRootPath())
	if e != nil {
		return e
	}
	target, e := filepath.Rel(base, dest)
	if e != nil || !filepath.IsLocal(target) || n == "." || target == "." {
		return fmt.Errorf("invalid rename outside storage root")
	}
	return r.Rename(n, target)
}
