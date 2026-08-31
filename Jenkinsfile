// Jenkins declarative pipeline — the same CI/CD flow as .github/workflows/ci.yml,
// expressed for Jenkins. This demonstrates the pipeline in the classic,
// self-hosted CI tool: on every build Jenkins checks out the code, installs
// dependencies, runs the quality gate (lint + tests), builds the Docker image,
// and (on main) deploys to Kubernetes.
//
// Requirements on the Jenkins host/agent: Node.js 20, Docker, and kubectl with
// a kubeconfig for the target cluster.

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    IMAGE_NAME = 'infra-health-dashboard'
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
    // A dummy value so `next build` never blocks on a missing var. No real
    // database is contacted at build time (all DB routes are dynamic).
    DATABASE_URL = 'postgres://user:pass@localhost:5432/db'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Test') {
      steps {
        sh 'npm test'
      }
    }

    stage('Build (Next.js)') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -t $IMAGE_NAME:$IMAGE_TAG -t $IMAGE_NAME:latest .'
      }
    }

    // Only deploy from the main branch — feature branches just get tested/built.
    stage('Deploy to Kubernetes') {
      when {
        branch 'main'
      }
      steps {
        // In a real setup you'd push the image to a registry first and set the
        // deployment to that tag. For a local/demo cluster, apply the manifests
        // and roll the app to the freshly built image.
        sh '''
          kubectl apply -f k8s/
          kubectl -n infra-health set image deployment/web web=$IMAGE_NAME:latest
          kubectl -n infra-health rollout status deployment/web --timeout=120s
        '''
      }
    }
  }

  post {
    always {
      // Jenkins archives test output / cleans the workspace between runs.
      cleanWs()
    }
    success {
      echo "Pipeline succeeded: built ${IMAGE_NAME}:${IMAGE_TAG}"
    }
    failure {
      echo 'Pipeline failed — check the stage logs above.'
    }
  }
}
