package op

import "github.com/OpenListTeam/OpenList/v4/internal/model"

// Keep only protocols that can be served entirely inside a local network.
func intranetDriverAllowed(name string) bool {
	switch name {
	case "Local", "SMB", "SFTP", "FTP", "WebDav", "S3", "Virtual":
		return true
	}
	return false
}

// Apply the edition policy both on startup and on settings writes/imports.
func NormalizeIntranetSetting(item *model.SettingItem) {
	switch item.Key {
	case "sso_login_enabled", "ldap_login_enabled":
		item.Value = "false"
		item.Flag = model.READONLY
	case "ocr_api":
		item.Value = ""
		item.Flag = model.READONLY
	case "iframe_previews", "external_previews":
		item.Value = "{}"
		item.Flag = model.READONLY
	}
}
