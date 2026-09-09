package handles

import (
	"github.com/OpenListTeam/OpenList/v4/server/common"
	"github.com/gin-gonic/gin"
)

func IntranetDisabled(c *gin.Context) {
	common.ErrorStrResp(c, "This feature is disabled in the intranet edition", 403)
}
