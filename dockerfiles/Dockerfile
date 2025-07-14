FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y curl unzip

ARG DOWNLOAD_URL

RUN curl -v -L $DOWNLOAD_URL -o project.zip \
    && file project.zip \
    && unzip -o project.zip \
    && rm project.zip

# RUN npm install -g npm@latest

RUN npm install

EXPOSE 5000

CMD ["tail", "-f", "/dev/null"]

# CMD ["npm", "run", "dev"]
