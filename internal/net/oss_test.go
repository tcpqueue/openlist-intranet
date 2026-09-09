package net

import (
	"net/http"
	"net/url"
	"testing"

	"github.com/OpenListTeam/OpenList/v4/internal/conf"
)

func TestNewOSSClientRejectsExternalProxy(t *testing.T) {
	oldConf := conf.Conf
	conf.Conf = conf.DefaultConfig("data")
	defer func() {
		conf.Conf = oldConf
	}()

	t.Setenv("HTTP_PROXY", "")
	t.Setenv("http_proxy", "")
	t.Setenv("HTTPS_PROXY", "http://127.0.0.1:7890")
	t.Setenv("https_proxy", "")
	t.Setenv("NO_PROXY", "")
	t.Setenv("no_proxy", "")

	client, err := NewOSSClient("https://oss-cn-hangzhou.aliyuncs.com", "test-access-key", "test-access-secret")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if client.HTTPClient == nil {
		t.Fatal("expected OSS client to use a custom HTTP client")
	}

	transport, ok := client.HTTPClient.Transport.(*safeTransport)
	if !ok {
		t.Fatalf("expected guarded transport, got %T", client.HTTPClient.Transport)
	}
	base, ok := transport.base.(*http.Transport)
	if !ok || base.Proxy != nil {
		t.Fatal("proxy must be disabled")
	}
	req := &http.Request{URL: &url.URL{Scheme: "https", Host: "oss-cn-hangzhou.aliyuncs.com"}}
	if _, err := transport.RoundTrip(req); err == nil {
		t.Fatal("external OSS must be rejected")
	}
}
