package config

import (
	"log"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Port  string `default:"8087"`
	Debug bool   `default:"true"`
}

func GetConfig() Config {

	var c Config
	if err := envconfig.Process("ws", &c); err != nil {
		log.Fatal("Failed to read environment variables")
	}

	return c
}
