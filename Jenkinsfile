pipeline {
  agent any

  environment {
    IMAGE_TAG    = "${GIT_COMMIT[0..7]}"
    REGISTRY     = 'ghcr.io/viminhthang'
    FE_IMAGE     = "${REGISTRY}/live-collaborative-frontend"
    BE_IMAGE     = "${REGISTRY}/live-collaborative-backend"
    GITHUB_TOKEN = credentials('github-token')
  }

  stages {
    stage('Build images') {
      when { branch 'main' }   // skip on PRs
      parallel {
        stage('Build frontend') {
          steps {
            sh 'docker build -t ${FE_IMAGE}:${IMAGE_TAG} -t ${FE_IMAGE}:latest ./frontend'
          }
        }
        stage('Build backend') {
          steps {
            sh 'docker build -t ${BE_IMAGE}:${IMAGE_TAG} -t ${BE_IMAGE}:latest ./backend'
          }
        }
      }
    }

    stage('Push to registry') {
      when { branch 'main' }
      steps {
        sh 'echo ${GITHUB_TOKEN} | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin'
        sh 'docker push ${FE_IMAGE}:${IMAGE_TAG} && docker push ${FE_IMAGE}:latest'
        sh 'docker push ${BE_IMAGE}:${IMAGE_TAG} && docker push ${BE_IMAGE}:latest'
      }
    }
    stage('Deploy to EC2') {
      when { branch 'main' }
      steps {
        withCredentials([
          sshUserPrivateKey(credentialsId: 'ec2-deploy-key',
                            keyFileVariable: 'SSH_KEY',
                            usernameVariable: 'SSH_USER'),
          string(credentialsId: 'app-server-host',
                variable: 'APP_HOST')
    ]) {
          sh """
  ls -la ${WORKSPACE}/docker-compose.yml
  scp -i \$SSH_KEY -o StrictHostKeyChecking=no ${WORKSPACE}/docker-compose.yml \$SSH_USER@\$APP_HOST:~/
  ssh -i \$SSH_KEY -o StrictHostKeyChecking=no \$SSH_USER@\$APP_HOST 'echo ${GITHUB_TOKEN} | docker login ghcr.io -u ViMinhThang --password-stdin && docker compose pull && docker compose up -d --remove-orphans'
"""
    }
      }
    }
  }

  post {
    success {
      echo "Deployed ${IMAGE_TAG} to EC2 successfully"
    }
    failure {
      echo 'Pipeline failed — check console output above'
    }
    always {
      sh 'docker logout ghcr.io || true'
    }
  }
}
