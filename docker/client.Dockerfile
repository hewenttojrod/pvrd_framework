FROM node:20-alpine

# WORKDIR /app

# #COPY ../client/package*.json ./

# # Copy setup script
# COPY client_setup.sh /client_setup.sh
# RUN chmod +x /client_setup.sh

# #COPY ../client /app

# # Run setup script (outputs to mounted volume)
# RUN /client_setup.sh

# EXPOSE 3000

# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

WORKDIR /app

COPY client/package.json .

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]