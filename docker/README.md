# Docker containers:

All containers are built to have access to the host machine file system they need to run. bat scripts are built to run via the docker containers to keep from extensive set up on the host machine. 

## Database
name: db
Port: 5432
Description: Postgres database pointing to database stored locally on the host machine. 

## Backend
name: api
Port: 8000
Description: Django web server used to handle dal/bll and db backend. Communicates with frontend via REST APIs

## Front end
name: web
Port: 3000
Description: React frontend to handle web pages. Communicates with django backend via REST APIs