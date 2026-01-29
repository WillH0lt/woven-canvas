package server

import (
	"ecs-sync-server/controllers"
	"ecs-sync-server/middlewares"
	"ecs-sync-server/socket"

	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middlewares.LoggerMiddleware())

	health := new(controllers.HealthController)
	controllers.NewRoomController(socket.GetHub())

	router.GET("/health", health.Status)
	router.GET("/ws", gin.WrapF(socket.ServeWs))

	return router
}
