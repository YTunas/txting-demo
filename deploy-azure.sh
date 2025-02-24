#!/bin/bash

echo "Building Angular application..."
cd txting-app
npm install
npm install -g @angular/cli
ng build --configuration production
cd ..

echo "Installing server dependencies..."
cd server
npm install
mkdir -p dist
cp -r ../txting-app/dist/txting-app/* ./dist/
cd ..

echo "Creating deployment package..."
zip -r dist.zip server/* txting-app/dist/txting-app/*

echo "Deploying to Azure..."
az webapp deploy --resource-group txting-demo-rg --name txting-demo --src-path dist.zip --type zip