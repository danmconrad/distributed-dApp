FROM node:carbon
WORKDIR /usr/app
ENV PATH="./node_modules/.bin:/opt/gtk/bin:${PATH}"

COPY ./package.json .
RUN npm install

COPY . .
