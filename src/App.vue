<template>
  <div class="calling-toolbar">
    <button @click="testIncomingCall" :disabled="isOnCall">Receive Call</button>
    <button @click="dialCall" :disabled="isOnCall">Dial Call</button>
    <button @click="toggleMute" :disabled="!isOnCall">
      {{ isMuted ? 'Unmute' : 'Mute' }}
    </button>
    <button @click="togglePause" :disabled="!isOnCall">
      {{ isPaused ? 'Continue' : 'Pause' }}
    </button>
    <button @click="hangUp" :disabled="!isOnCall">Hang Up</button>
    <input v-model="phoneNumber" placeholder="Enter phone number" :disabled="isOnCall" />

    <!-- Display response messages here -->
    <div v-if="message" class="response-message">{{ message }}</div>
  </div>
</template>

<script>
import axios from 'axios';
import { Device } from 'twilio-client';

const API_BASE_URL = 'https://c109-120-61-117-114.ngrok-free.app'; // Update this with your actual ngrok URL

export default {
  name: 'CallingToolbar',
  data() {
    return {
      isOnCall: false,
      isMuted: false,
      isPaused: false,
      phoneNumber: '',
      currentCallSid: null,
      device: null,
      connection: null,
      incomingConnection: null,
      setupError: null,
      message: '',
    };
  },
  mounted() {
    this.setupTwilioDevice();
  },
  methods: {
    async setupTwilioDevice() {
      try {
        console.log('Attempting to retrieve Twilio token...');
        const response = await axios.get(`${API_BASE_URL}/api/token`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: false
        });
        
        console.log('Full response:', response);

        if (!response.data || !response.data.token) {
          throw new Error('Token not found in the response');
        }

        console.log('Received token:', response.data.token);

        this.device = new Device(response.data.token, {
          codecPreferences: ['opus', 'pcmu'],
          fakeLocalDTMF: true,
          enableRingingState: true,
        });

        this.device.on('incoming', (connection) => {
          console.log('Incoming call detected');
          this.incomingConnection = connection;
        });

        this.device.on('connect', (conn) => {
          console.log('Connected to call');
          this.isOnCall = true;
          this.connection = conn;
          this.currentCallSid = conn.parameters.CallSid;
        });

        this.device.on('disconnect', () => {
          console.log('Call disconnected');
          this.resetCallState();
        });

        this.device.on('error', (error) => {
          console.error('Twilio device error:', error);
          this.setupError = error.message;
        });

        await this.device.register();
        console.log('Twilio device registered successfully');
      } catch (error) {
        console.error('Error setting up Twilio device:', error);
        this.setupError = error.message;
      }
    },
    async testIncomingCall() {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/test-incoming-call`);
        this.isOnCall = true;
        this.message = response.data.success ? 'Simulated incoming call triggered' : 'Failed to trigger simulated call';
        if (response.data.success) {
          console.log('Simulated incoming call triggered:', response.data);
          await this.receiveCall();
        }
      } catch (error) {
        console.error('Error triggering simulated incoming call:', error);
      }
    },
    async receiveCall() {
      if (this.incomingConnection) {
        console.log("Attempting to accept incoming call...");
        try {
          await this.incomingConnection.accept();
          this.isOnCall = true;
          this.connection = this.incomingConnection;
          this.currentCallSid = this.connection.parameters.CallSid;
          console.log('Call received and accepted. isOnCall:', this.isOnCall);
          this.incomingConnection = null;
        } catch (error) {
          console.error('Error accepting incoming call:', error);
        }
      } else {
        console.warn('No active connection to accept');
      }
    },
    async dialCall() {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/dial`, { phoneNumber: this.phoneNumber });
        this.message = response.data.success ? `Dialing call to ${this.phoneNumber}` : 'Failed to dial call';
        if (response.data.success) {
          console.log('Dialing call');
          this.isOnCall = true;
          this.currentCallSid = response.data.callSid;
          if (this.device) {
            this.connection = await this.device.connect({ params: { CallSid: this.currentCallSid } });
          }
        }
      } catch (error) {
        console.error('Error dialing:', error);
      }
    },
    async toggleMute() {
      if (this.connection) {
        this.isMuted = !this.isMuted;
        await this.connection.mute(this.isMuted);
        console.log(`Call ${this.isMuted ? 'muted' : 'unmuted'}`);
      }
    },
    async togglePause() {
      if (this.connection) {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
          await this.connection.mute(true);
          this.connection.disconnect({ stop: true });
        } else {
          await this.connection.mute(false);
          this.connection.disconnect({ stop: false });
        }
        console.log(`Call ${this.isPaused ? 'paused' : 'resumed'}`);
      }
    },
    async hangUp() {
      if (this.connection) {
        this.connection.disconnect();
      }
      if (this.currentCallSid) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/hangup`, { callSid: this.currentCallSid });
          this.message = response.data.success ? 'Call ended' : 'Failed to hang up call';
          if (response.data.success) {
            console.log('Call ended');
          }
        } catch (error) {
          console.error('Error hanging up:', error);
        }
      }
      this.resetCallState();
    },
    resetCallState() {
      this.isOnCall = false;
      this.currentCallSid = null;
      this.isMuted = false;
      this.isPaused = false;
      this.connection = null;
      console.log('Call state reset');
    },
  },
};
</script>

<style scoped>
.calling-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>