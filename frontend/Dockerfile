FROM node:18-alpine

WORKDIR /app

COPY package.json .

RUN npm install && npm rebuild esbuild

RUN npm install --save-dev assemblyscript

COPY . .

RUN npx asc assembly/index.ts -b release.wasm --optimize

RUN mkdir -p public && mv build/release.wasm public/release.wasm

RUN npm run build

EXPOSE 4173

CMD [ "npm", "run", "preview" ]