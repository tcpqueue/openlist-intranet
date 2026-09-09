package net

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIntranetAddresses(t *testing.T) {
	for _, address := range []string{"127.0.0.1:80", "localhost:80", "10.1.2.3:22", "172.16.0.1", "192.168.1.2", "[::1]:80", "http://[fd00::1]:8080/a", "https://192.168.1.2/a"} {
		if err := ValidateIntranetAddress(address); err != nil {
			t.Errorf("allowed %s: %v", address, err)
		}
	}
	for _, address := range []string{"example.com:443", "8.8.8.8:53", "https://example.com", "https://1.1.1.1/a", "169.254.169.254", "0.0.0.0", "https://user@127.0.0.1", "ftp://127.0.0.1", "http://[2001:4860:4860::8888]"} {
		if err := ValidateIntranetAddress(address); err == nil {
			t.Errorf("accepted public/invalid %s", address)
		}
	}
}

func TestIntranetRedirectAndProxy(t *testing.T) {
	proxyUsed := false
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { proxyUsed = true; w.WriteHeader(502) }))
	defer proxy.Close()
	t.Setenv("HTTP_PROXY", proxy.URL)
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "http://external.example/test", 302) }))
	defer source.Close()
	transport := http.DefaultTransport.(*http.Transport).Clone()
	RestrictTransport(transport)
	defer transport.CloseIdleConnections()
	if transport.Proxy != nil {
		t.Fatal("proxy enabled")
	}
	client := &http.Client{Transport: transport}
	if response, err := client.Get(source.URL); err == nil {
		response.Body.Close()
		t.Fatal("external redirect accepted")
	}
	if proxyUsed {
		t.Fatal("environment proxy used")
	}
	req, _ := http.NewRequest("GET", "http://external.example", nil)
	if _, err := (&safeTransport{base: transport}).RoundTrip(req); err == nil {
		t.Fatal("external hostname accepted")
	}
}
