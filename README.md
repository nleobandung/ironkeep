# Overview
This application is a MERN full-stack logic-shooter game where players will have to decide where to place their shooters so they can attack their enemies and deduct off their life-span before the enemies escape alive. We used React+Vite on the frontend, Node, on the backend, Express for our api endpoints, and a ODM, Mongodb for our database along with Redis for caching. Other features such as PWA, Bycrypt, Cookies, and JWT is also used. Both frondend and backend have their respective Dockerfiles and Kubernetes manifests.
<img width="439" height="293" alt="Screenshot 2025-09-24 at 11 43 41 PM" src="https://github.com/user-attachments/assets/6c9d713c-92f7-4011-9290-8df17223d876" />

## Testing on Local (not recommended)
Here are instructions to run our app locally. Note that the current codebase is tailored towards GKE deployment, so not all functionality will work.

### Setup

#### 1. Clone the GitHub Repository

```bash
git clone https://github.com/Prof-Rosario-UCLA/team24.git
cd team24
 ```

#### 2. '.env' File
Create a .env file in the root of the project and add the following environment variable:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<jwt>
 ```

#### 3. Install Dependencies

Make sure you have Vite, Node.js, and  Redis installed, then install the required packages:
Run this on both backend and frontend directories
```bash
npm install
 ```
### 4. Local Run
For local run, run 'npx vite' in the frontend and 'npm start' in the backend. Go to the link that npx vite takes you too. Note - communication between the frontend and backend do not seem to work for localhost, only on GKE deployment.

## Deploying on Google Kubernetes Engine
### Option 1 - CI/CD with Cloud Build Trigger
In cloudbuild.yaml, the commands have to be updated with a new cluster, artifact repo, region, and log bucket. GKE complained when we did not have a log bucket, so you should also create a log bucket for this.
In every relevant command, change the region, cluster, artifact repo, and log bucket name. Here are some lines from cloudbuild.yaml. 
Note that this is not an exhaustive list of all the lines that need changing.
```bash
args: ['build', '-t', '<ARTIFACT_REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/frontend:latest', './frontend']
- 'CLOUDSDK_COMPUTE_REGION=<CLUSTER_REGION>'
- 'CLOUDSDK_CONTAINER_CLUSTER=<CLUSTER_NAME>'
'<ARTIFACT_REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/frontend:latest'
logsBucket: gs://<LOG_BUCKET_NAME>
args: ['rollout', 'restart', 'deployment/game']
```

Kubernetes secret must be created. Run the following command in GKE, naming the secret game-secrets and obtaining the MONGO_URI and JWT_SECRET values from our project report.
```bash
kubectl create secret generic game-secrets \
  --from-literal=MONGO_URI=<mongo_uri> \
  --from-literal=JWT_SECRET=<jwt_secret>
```

In GKE, create a cloud build trigger. Beyond the default settings, connect the Git repository and branch that you wish to set up CI/CD with, and select Cloud Build cnofiguration file (yaml or json) for Configuration Type selection. For choosing the service account, make sure that the service account has the necessary permissions to read and write to the Artifact Registry.
![image](https://github.com/user-attachments/assets/aa685343-50c1-4ece-bb46-8812a74decc9)

Now, when you commit to the repository, a build should be triggered in GKE!

### Option 2 - Manual Deployment
Connect to the GKE cluster and clone the repository in there. 
Build the docker images.

```bash
cd backend
docker buildx build -t team24-backend .
 ```

```bash
cd ../frontend
docker buildx build -t team24-frontend .
cd ..
 ```
Make sure to tag and push these images.

```bash
docker tag frontend <REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/frontend:latest
docker tag backend <REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/backend:latest
docker push <REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/frontend:latest
docker push <REGION>-docker.pkg.dev/<CLUSTER_NAME>/<ARTIFACT_REPO_NAME>/backend:latest
```

Kubernetes secret must be created. Run the following command in GKE, naming the secret game-secrets and obtaining the MONGO_URI and JWT_SECRET values from our project report.
```bash
kubectl create secret generic game-secrets \
  --from-literal=MONGO_URI=<mongo_uri> \
  --from-literal=JWT_SECRET=<jwt_secret>
```
If this is troublesome, simply hardcoding the two environmental variables into k8s/deployment.yaml will work.
```bash
- name: MONGO_URI
  value: <mongo_uri>
- name: JWT_SECRET
  value: <jwt_secret>
```
Apply the manifest yaml files.
```bash
kubectl apply -f k8s/certificate.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/frontendconfig.yaml
kubectl apply -f k8s/ingress.yaml
 ```
Now, the app should be deployed and reachable at https://team24.cs144.org

## API Endpoints 
* note: The example responses shown are for illustration only. Actual responses may vary depending on the current state of the database. Please use your own VALID data when testing the endpoints.
  
Check Password Hash - Check if a user's password is hashed (bcrypt).
Endpoint: GET /api/auth/check-password-hash/:username
Example: /api/auth/check-password-hash/test1

```bash
{
  "username": "test1",
  "isHashed": true
}
```

User Login - Login user with username and password, returns auth cookie.
Endpoint: POST /api/auth/login
Example request body:

```bash
{
  "username": "test1",
  "password": "mypassword123"
}
```
```bash
{
  "message": "Logged in"
}
```
User Logout - Logout user by clearing the auth cookie.
Endpoint: POST /api/auth/logout
Example response:

```
bash{
  "message": "Logged out"
}
```

View Game Progress by Username - Retrieve game progress details for a player, cached via Redis.
Endpoint: GET /api/gameprogress/viewGameProgress/:username
Example: /api/gameprogress/viewGameProgress/test1

```
bash {
  "_id": "60a...",
  "gamer": {
    "_id": "60a...",
    "username": "test1",
    "avatarname": "Dragonball"
  },
  "lastlogin": "2025-06-11T18:24:43.511Z",
  "timePlayed": 3600,
  "progress": {
    "levelFinished": 5,
    "totalPoints": 5000
  }
}
 ```

View Progress for All Users - Get top 5 players' progress sorted by level finished.
Endpoint: GET /api/gameprogress/viewPlayerProgressAll
Example response:


```
bash [
  {
    "username": "test1",
    "levelFinished": 5,
    "timePlayed": 3600
  },
  {
    "username": "test2",
    "levelFinished": 4,
    "timePlayed": 2400
  }
]
```
![cnm0932t](https://github.com/user-attachments/assets/c369bbbe-b9bb-42f3-b973-0e403c368f01)


# TO PLAY THE GAME
- Each Grass platform is an available spot to place a 2x2 tower on. 
- The top left tile of each grass platform is where you should hover and click (drag and drop later) to place the tower.
- Towers currently cost 50 coins, and you start with 100. Each kill of an enemy earns you 10 coins.
- There are now waves where after every subsequent wave kill, 2 additional enemies will spawn!
