package server

import "ecs-sync-server/config"

func Init() {
	config := config.GetConfig()
	r := NewRouter()
	r.Run(":" + config.Port)
}
