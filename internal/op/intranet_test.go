package op

import (
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"testing"
)

func TestIntranetPolicy(t *testing.T) {
	for _, name := range []string{"Local", "SMB", "SFTP", "FTP", "WebDav", "S3", "Virtual"} {
		if !intranetDriverAllowed(name) {
			t.Fatalf("local protocol rejected: %s", name)
		}
	}
	for _, name := range []string{"AliyundriveOpen", "BaiduNetdisk", "Doge", "139Yun"} {
		if intranetDriverAllowed(name) {
			t.Fatalf("cloud driver allowed: %s", name)
		}
	}
	for _, key := range []string{"sso_login_enabled", "ldap_login_enabled", "ocr_api", "iframe_previews", "external_previews"} {
		item := model.SettingItem{Key: key, Value: "https://external.example"}
		NormalizeIntranetSetting(&item)
		if item.Value == "https://external.example" || item.Flag != model.READONLY {
			t.Fatalf("policy not enforced: %s", key)
		}
	}
	custom := model.SettingItem{Key: "site_title", Value: "Internal files"}
	NormalizeIntranetSetting(&custom)
	if custom.Value != "Internal files" {
		t.Fatal("unrelated setting modified")
	}
}
