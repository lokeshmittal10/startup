# Production Deployment Guide: OmniMind v2.0 on Google Compute Engine (GCE)

This guide walks you through deploying the stateful, containerized OmniMind v2.0 application on a Google Compute Engine VM instance inside a Docker container.

---

## Prerequisites
1. A **GCE VM Instance** running (preferably Ubuntu/Debian).
2. **Docker** installed on the VM.
3. **Google Cloud SDK (`gcloud`)** initialized and authenticated.
4. The VM service account must have **Vertex AI User** (`roles/aiplatform.user`) permissions to allow token generation.

---

## Step-by-Step Deployment

### Step 1: SSH into your GCE Instance
Open your local terminal and connect to your virtual machine:
```bash
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE --project=gen-lang-client-0963866277
```

### Step 2: Clone the Repository
Inside the VM, clone your synchronized startup repository and navigate to the project directory:
```bash
# Clone the repository
git clone https://github.com/lokeshmittal10/startup.git

# Navigate to the personal brain directory
cd startup
```

### Step 3: Build the Docker Image
Compile the stateful Node/Express application using the production Dockerfile:
```bash
docker build -t omnimind-backend .
```

### Step 4: Run the Stateful Container
Run the container in detached mode (`-d`) mapping port `3000` of the host VM to port `3000` of the container:
```bash
docker run -d \
  -p 3000:3000 \
  --name omnimind-v2 \
  --restart unless-stopped \
  omnimind-backend
```

*Note: The server will automatically query GCE's local Metadata Server to sign Vertex AI requests securely using the VM's IAM Service Account credentials.*

---

## Network & Firewall Configuration (GCP Console)

To access your application from a browser, GCP must allow incoming TCP traffic on port `3000`.

1. Go to the **Google Cloud Console**.
2. Navigate to **VPC Network** > **Firewall**.
3. Click **Create Firewall Rule**.
4. Configure the following properties:
   * **Name**: `allow-omnimind-tcp-3000`
   * **Network**: `default`
   * **Direction of traffic**: `Ingress`
   * **Action on match**: `Allow`
   * **Targets**: `Specified target tags` (e.g. `http-server`) or `All instances in the network`
   * **Source filter**: `IPv4 ranges`
   * **Source IPv4 ranges**: `0.0.0.0/0` (Allows global traffic; you can restrict this to your specific public IP for security).
   * **Protocols and ports**: Select **Specified protocols and ports**, check **TCP**, and input `3000`.
5. Click **Create**.

---

## Step 5: Verify the Deployment
Once the firewall rule is created:
1. Find your VM's **External IP address** via the GCP Console or by running:
   ```bash
   gcloud compute instances list
   ```
2. Open your web browser and navigate to:
   ```text
   http://<YOUR_VM_EXTERNAL_IP>:3000
   ```
3. Test your voice commands and verify that the system successfully processes queries using the secure backend-delegated Vertex AI tokens!
