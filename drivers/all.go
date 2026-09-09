package drivers

import (
	_ "github.com/OpenListTeam/OpenList/v4/drivers/ftp"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/local"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/s3"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/sftp"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/smb"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/virtual"
	_ "github.com/OpenListTeam/OpenList/v4/drivers/webdav"
)

// All do nothing,just for import
// same as _ import
func All() {
}
