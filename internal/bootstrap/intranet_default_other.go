//go:build !linux

package bootstrap

func EnsureIntranetDefaultStorage() error { return nil }
