package main

import (
	"ecs-sync-server/server"
	"ecs-sync-server/socket"
)

func main() {
	socket.Init()
	server.Init()
}
