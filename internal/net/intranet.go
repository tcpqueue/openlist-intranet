package net

import (
	"context"
	"fmt"
	stdnet "net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Require literal private/loopback addresses so an external DNS resolver or
// a DNS rebinding response cannot create an unexpected public connection.
func ValidateIntranetAddress(address string) error {
	host := address
	if strings.Contains(address, "://") {
		u, err := url.Parse(address)
		if err != nil || u.User != nil || (u.Scheme != "http" && u.Scheme != "https") {
			return fmt.Errorf("invalid intranet HTTP endpoint")
		}
		host = u.Hostname()
	} else if h, _, err := stdnet.SplitHostPort(address); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")
	if host == "localhost" {
		return nil
	}
	ip := stdnet.ParseIP(host)
	if ip == nil || (!ip.IsPrivate() && !ip.IsLoopback()) {
		return fmt.Errorf("intranet endpoint must use a private or loopback IP address")
	}
	return nil
}

func IntranetDialContext(ctx context.Context, network, address string) (stdnet.Conn, error) {
	if err := ValidateIntranetAddress(address); err != nil {
		return nil, err
	}
	host, port, err := stdnet.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	if host == "localhost" {
		address = stdnet.JoinHostPort("127.0.0.1", port)
	}
	return (&stdnet.Dialer{Timeout: 30 * time.Second, KeepAlive: 30 * time.Second}).DialContext(ctx, network, address)
}

func RestrictTransport(t *http.Transport) {
	t.Proxy = nil
	t.DialContext = IntranetDialContext
	t.DialTLSContext = nil
}

func InitIntranetHTTP() {
	t := http.DefaultTransport.(*http.Transport).Clone()
	RestrictTransport(t)
	http.DefaultTransport = t
}
