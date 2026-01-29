FROM golang:1.23-alpine AS build

WORKDIR /app

COPY go.* ./
RUN go mod download

COPY . .

ENV GOCACHE=/root/.cache/go-build
RUN --mount=type=cache,target="/root/.cache/go-build" CGO_ENABLED=0 GOOS=linux go build -o server .

FROM scratch
WORKDIR /app
COPY --from=build /app/server server

CMD ["/app/server"]
