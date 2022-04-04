# base stage
FROM node:16 as base
WORKDIR /app

RUN yarn global add @vue/cli

# setup environment variables
RUN env
ENV HOST=0.0.0.0

COPY package.json yarn.lock ./
COPY . /app
RUN yarn
EXPOSE 3000
CMD ["yarn","start"]
