# pvrd_framework
Framework Rebuild from scratch for Postgres-Vite/React-Django

# wording key
To keep verbiage consistent here is what a reference guide:
client - React frontend
server - Django/REST API backend
framework - core Django project found in /server when referencing python code or core React project found in /client when referencing typescript/css/html
web container - container storing client
api container - container storing server


# module structure

## base
contain an python init file to make sure django framework can pick up folder
registry.py is used to point django to the right configuration elements and make it easier for pulling in the app details. If an element is None or undefined django will skip it.

## client
holds react specific functionality. should be allowed to use assets in framework but not from other modules.

## server
holds django specific functionality.
use registry.py in base dir to make it usable by framework
use:
from django.conf import settings
in the file (subject to change)

## shared
any shared information that might be useful for both client and server