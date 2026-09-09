package middlewares

import "github.com/gin-gonic/gin"

func IntranetResources(c *gin.Context) {
	c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' blob:; media-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("X-Frame-Options", "SAMEORIGIN")
	c.Header("X-DNS-Prefetch-Control", "off")
	c.Header("Referrer-Policy", "no-referrer")
	c.Next()
}
