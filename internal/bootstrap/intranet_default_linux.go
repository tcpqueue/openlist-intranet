package bootstrap

import (
	"encoding/json"
	"fmt"
	"github.com/OpenListTeam/OpenList/v4/cmd/flags"
	"github.com/OpenListTeam/OpenList/v4/internal/db"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"os"
	"path/filepath"
	"syscall"
	"time"
)

const defaultIntranetFolder = "/tmp/openlist"

func ensureDefaultFolder(folder string) error {
	if err := os.Mkdir(folder, 0750); err != nil && !os.IsExist(err) {
		return err
	}
	info, err := os.Lstat(folder)
	if err != nil {
		return err
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !info.IsDir() || !ok || stat.Uid != uint32(os.Geteuid()) || info.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("default storage directory must be owned by the service user, not a symlink, and not writable by other users: %s", folder)
	}
	return nil
}

func EnsureIntranetDefaultStorage() error {
	storages, count, err := db.GetStorages(1, 1000000)
	if err != nil {
		return err
	}
	for _, storage := range storages {
		var addition struct {
			Root string `json:"root_folder_path"`
		}
		if storage.Driver == "Local" && !storage.Disabled && json.Unmarshal([]byte(storage.Addition), &addition) == nil && addition.Root == defaultIntranetFolder {
			if err := ensureDefaultFolder(defaultIntranetFolder); err != nil {
				return err
			}
		}
	}
	marker := filepath.Join(flags.DataDir, ".intranet-storage-initialized")
	if _, err := os.Stat(marker); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	if count == 0 {
		if err := ensureDefaultFolder(defaultIntranetFolder); err != nil {
			return err
		}
		addition, _ := json.Marshal(map[string]interface{}{"root_folder_path": defaultIntranetFolder, "show_hidden": false, "mkdir_perm": "750"})
		storage := model.Storage{MountPath: "/", Driver: "Local", Addition: string(addition), Remark: "默认本地存储", Modified: time.Now()}
		storage.WebProxy = true
		storage.WebdavPolicy = "native_proxy"
		if err := db.CreateStorage(&storage); err != nil {
			return err
		}
	}
	return os.WriteFile(marker, []byte("initialized\n"), 0600)
}
