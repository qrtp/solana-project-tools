<template class="main">
  <div>
    <div class="block text-gray-700 text-sm mx-auto" v-if="step === 1">
      <img class="mx-auto" src="/loading.gif" />
    </div>
    <div class="block text-gray-700 text-sm mx-auto" v-if="step === 2">
      <img class="mx-auto" src="/loading.gif" />
    </div>
    <div class="block text-gray-700 text-sm mb-3" v-if="step > 2">
      <img
        alt="Discord profile pic"
        v-if="discordAvatar !== ''"
        class="rounded-full border-4 border-white w-20 my-0 mx-auto mb-4"
        :src="discordAvatar"
      />
      <h2 class="block text-gray-700 text-3xl font-bold mb-2">
        {{ discordUsername }}
      </h2>
    </div>
    <div class="block text-gray-700 text-sm mx-auto" v-if="step === 3">
      <div class="block text-gray-700 text-sm mb-5">
        <v-dialog v-model="dialog" persistent max-width="305">
          <template v-slot:activator="{ on, attrs }">
            <v-btn color="primary" dark v-bind="attrs" v-on="on">
              Connect Wallet
            </v-btn>
          </template>
          <v-card>
            <v-card-title class="text-h5"> Choose a Wallet </v-card-title>
            <v-card-text
              >The wallet will be inspected to verify the project's NFT
              requirements.</v-card-text
            >
            <v-card-actions>
              <v-btn
                color="green darken-1"
                text
                @click="connectWallet('phantom')"
                >Phantom</v-btn
              >
              <v-btn
                color="green darken-1"
                text
                @click="connectWallet('solflare')"
                >Solflare</v-btn
              >
              <v-btn color="green darken-1" text @click="connectWallet('slope')"
                >Slope</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 4">
      Please sign the message to verify that you're the owner of your wallet. We
      are about to make sure it holds the required tokens for your Discord
      validation.
      <br />
      <br />
      Review the message before signing and make sure that nothing else is
      requested except signature.
    </div>
    <div class="block text-gray-700 text-sm mx-auto" v-if="step === 12">
      <img class="mx-auto" src="/loading.gif" />
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 5">
      You're verified! You can close this window now and flex your new discord
      power.
      <div
        class="mt-3 ml-3 text-lg"
        v-for="(discord_role, k) in verifiedRoles"
        :key="k"
      >
        <v-icon>mdi-check-decagram</v-icon> {{ discord_role.name }}
      </div>
      <div class="mt-3 ml-3 text-lg" v-if="verifiedDonations > 0">
        <v-icon>mdi-hand-coin</v-icon> Thank you for donating!
      </div>
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 7">
      <v-icon>mdi-alert-octagon</v-icon> {{ verificationMessage }}
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 8">
      Project not found.
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 9">
      Unable to verify your wallet for this project. Try again later or contact
      your project owner.
    </div>
    <div class="block text-gray-700 text-sm" v-if="step === 10">
      We're having trouble connecting to your wallet. The currently supported
      wallets are <a class="hyperlink" href="https://phantom.app">Phantom</a>,
      <a class="hyperlink" href="https://solflare.com">Solflare</a> and
      <a class="hyperlink" href="https://slope.finance">Slope</a>. When using a
      mobile device, please ensure the current browser is supported by your
      wallet.
    </div>
    <div class="block text-gray-700 text-sm mt-10" v-if="step > 2">
      <div
        v-if="
          step === 5 &&
          projectConfig.data.donations_remaining > 0 &&
          !projectConfig.data.is_holder &&
          !verifiedUpgraded
        "
      >
        <h2 class="block text-gray-700 text-xl font-bold mb-1">
          Help {{ projectConfig.data.project_friendly_name }}, help the world!
        </h2>
        <div class="block text-gray-700 text-sm mb-5">
          You can make a difference. Only
          <b>{{ donationMessage }}</b>
          left to gift your community with premium features like sales
          notifications, DAO voting, airdrop snapshots and enhanced Discord
          roles.
        </div>
        <div class="block text-gray-700 text-sm mb-5">
          <v-btn color="primary" dark @click="donateDialog = true">
            Donate
          </v-btn>
        </div>
      </div>
      <div
        v-if="
          step === 5 &&
          (projectConfig.data.donations_remaining == 0 ||
            projectConfig.data.is_holder)
        "
      >
        <h2 class="block text-gray-700 text-xl font-bold mb-1">
          Thank you, {{ projectConfig.data.project_friendly_name }}!!
        </h2>
        <div class="block text-gray-700 text-sm mb-5">
          Your community has made a global impact through NFT 4 Cause donations.
          We are very grateful! If you want to learn more or get involved, join
          the conversation
          <a href="https://twitter.com/NFT4cause">@NFT4Cause</a>.
        </div>
      </div>
      <h2 class="block text-gray-700 text-xl font-bold mb-1">
        What is NFT 4 Cause?
      </h2>
      <div class="block text-gray-700 text-sm mb-5">
        At
        <a class="hyperlink" href="http://www.nft4cause.app">NFT 4 Cause</a> we
        create socially relevant NFTs and
        <b>donate 80% of our proceeds to global nonprofits</b> chosen by our
        holders! Everything else funds the development of free tools like this
        to enhance the Solana community.
      </div>
    </div>
    <v-dialog v-model="donateDialog" persistent max-width="350">
      <v-card>
        <v-card-title class="text-h5"> You can help! </v-card-title>
        <v-card-text
          >Mint a Pandemic Heros NFT to help your community unlock exclusive
          features, and we'll donate <b>80% of the proceeds to charity</b>. As a
          holder you can vote to choose our charity at the end of every
          quarter!</v-card-text
        >
        <v-card-text
          >If you choose to donate, come back and verify again with the same
          wallet. We'll update your community's status
          automatically!</v-card-text
        >
        <v-card-actions>
          <v-btn color="green darken-1" text href="https://mint.nft4cause.app"
            >Mint</v-btn
          >
          <v-btn color="green darken-1" text @click="donateDialog = false"
            >Cancel</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import axios from "axios";
import Solflare from "@solflare-wallet/sdk";
const { binary_to_base58 } = require("base58-js");

export default Vue.extend({
  data() {
    return {
      discordUsername: "",
      step: 1,
      discordAvatar: "",
      projectName: "",
      projectConfig: {},
      verificationMessage: "",
      donationMessage: "",
      donateDialog: false,
      verifiedDonations: 0,
      verifiedUpgraded: false,
      verifiedRoles: [
        {
          id: "",
          name: "",
        },
      ],
    };
  },
  async mounted() {
    // Retrieve the project config based on wildcard path
    this.projectName = this.$route.path.replaceAll("/", "");
    try {
      this.projectConfig = await axios.get(
        "/api/getProject?project=" + this.projectName
      );
    } catch (e) {
      console.log(e);
    }

    // return not found if the project config is empty
    if (!this.projectConfig) {
      this.step = 8;
      return;
    }

    // Get discord bearer token from url hash params
    const url_params: { access_token?: string } = this.$route.hash
      .split("&")
      .map((v) => v.split("="))
      .reduce((pre, [key, value]) => ({ ...pre, [key]: value }), {});
    if (!url_params.access_token) {
      // @ts-ignore
      const url = `https://discord.com/api/oauth2/authorize?client_id=${this.projectConfig.data.discord_client_id}&redirect_uri=${this.projectConfig.data.discord_redirect_url}&response_type=token&scope=identify`;
      window.location.href = url;
    }

    // @ts-ignore
    // get donation message
    this.donationMessage = `${this.projectConfig.data.donations_remaining} donation`;
    // @ts-ignore
    if (this.projectConfig.data.donations_remaining > 1) {
      this.donationMessage = this.donationMessage + "s";
    }

    // Get discord username from token
    let res = { data: { username: "", discriminator: "", id: "", avatar: "" } };
    try {
      res = await axios.get("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${url_params.access_token}`,
        },
      });
    } catch (e) {
      console.log(e);
      return;
    }
    this.step = 2;
    this.discordUsername = `${res.data.username}#${res.data.discriminator}`;
    this.discordAvatar = `https://cdn.discordapp.com/avatars/${res.data.id}/${res.data.avatar}.png`;
    this.step = 3;
  },
  methods: {
    async connectWallet(walletType: string) {
      // determine the type of wallet
      let wallet;
      if (walletType == "phantom") {
        // connect to phantom wallet
        wallet = window.solana;
      } else if (walletType == "slope") {
        // connect to slope wallet
        wallet = new window.Slope();
      } else {
        // connect to solflare wallet
        wallet = new Solflare();
      }

      try {
        await wallet.connect();
      } catch (e) {
        console.log(e);
        this.step = 10;
        return;
      }

      this.step = 4;

      try {
        if (!this.projectConfig) {
          return;
        }

        // Signs message to verify authority
        // @ts-ignore
        const message = this.projectConfig.data.message;
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await wallet.signMessage(encodedMessage, "utf8");

        // determine b58 encoded signature
        let publicKey;
        let signature;
        if (signedMessage.data && signedMessage.data.signature) {
          // slope format
          signature = signedMessage.data.signature;
          publicKey = signedMessage.data.publicKey;
        } else {
          // phantom and solflare format
          signature = binary_to_base58(
            signedMessage.signature ? signedMessage.signature : signedMessage
          );
          publicKey = wallet.publicKey.toString();
        }
        console.log(`publicKey=${publicKey}, signature=${signature}`);

        // Sends signature to the backend
        try {
          this.step = 12;
          let res2 = await axios.post("/api/verify", {
            projectName: this.projectName,
            discordName: this.discordUsername,
            signature: signature,
            // @ts-ignore I honestly didn't wanna bother with strong typing this.. Feel free if you'd like
            publicKey: publicKey,
          });
          console.log(
            `validated role status ${res2.status} with roles ${JSON.stringify(
              res2.data
            )}`
          );
          if (res2.status == 200) {
            this.verifiedRoles = res2.data.roles;
            this.verifiedDonations = res2.data.donations;
            this.verifiedUpgraded = res2.data.upgraded;
            this.step = 5;
            return;
          }
          throw "unexpected response code";
        } catch (e) {
          console.log(`error response ${JSON.stringify(e)}`);
          if (e.response && e.response.data.message) {
            this.verificationMessage = e.response.data.message;
            this.step = 7;
          } else {
            this.step = 9;
          }
        }
      } catch (e2) {
        console.log(e2);
        this.step = 10;
      }
    },
  },
});
</script>
