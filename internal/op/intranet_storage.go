package op

import (
	"encoding/json"
	"fmt"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	intranetnet "github.com/OpenListTeam/OpenList/v4/internal/net"
	"strings"
)

func normalizeIntranetStorage(s *model.Storage) error {
	if !intranetDriverAllowed(s.Driver) {
		return fmt.Errorf("driver disabled in intranet edition")
	}
	s.DownProxyURL = ""
	s.WebProxy = true
	s.WebdavPolicy = "native_proxy"
	if s.Driver == "Local" || s.Driver == "Virtual" {
		return nil
	}
	var a map[string]interface{}
	if err := json.Unmarshal([]byte(s.Addition), &a); err != nil {
		return err
	}
	key := "address"
	if s.Driver == "S3" {
		key = "endpoint"
	}
	endpoint, _ := a[key].(string)
	if err := intranetnet.ValidateIntranetAddress(endpoint); err != nil {
		return err
	}
	if s.Driver == "SFTP" || s.Driver == "SMB" {
		a[key] = strings.Replace(endpoint, "localhost", "127.0.0.1", 1)
	}
	if s.Driver == "S3" {
		a["force_path_style"] = true
		a["custom_host"] = ""
		a["direct_upload_host"] = ""
		a["enable_direct_upload"] = false
	}
	if s.Driver == "WebDav" {
		a["vendor"] = "other"
	}
	raw, err := json.Marshal(a)
	if err != nil {
		return err
	}
	s.Addition = string(raw)
	return nil
}
