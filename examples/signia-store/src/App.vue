<template>
  <div
    class="flex items-center justify-center gap-4 w-full h-screen"
    :style="{ backgroundColor: darkerColor.value }"
  >
    <button
      v-for="color in colors"
      :key="color"
      class="w-24 h-8 rounded text-white cursor-pointer hover:brightness-110"
      :style="{ backgroundColor: color }"
      @click="colorAtom.set({ color })"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAtom, useComputed } from "signia-vue";
import tinyColor from "tinycolor2";
import {
  transact,
  atom,
  computed as signiaComputed,
  transaction,
} from "signia";

const firstName = atom("firstName", "David");
const lastName = atom("lastName", "Bowie");

const fullName = signiaComputed("fullName", () => {
  return `${firstName.value} ${lastName.value}`;
});

transact(() => {
  firstName.set("John");
  lastName.set("Lennon");

  transaction((rollback) => {
    firstName.set("Paul");
    lastName.set("McCartney");
    console.log(fullName.value); // Paul McCartney
    rollback();
  });
  console.log(fullName.value); // John Lennon

  firstName.set("George");
  lastName.set("Harrison");
});

const fullNameVue = useAtom("fullNameVue", fullName);

console.log(fullNameVue.value); // George Harrison

const colorAtom = useAtom("signia-store", {
  color: "#ff0000",
});

const darkerColor = useComputed("computedColor", () => {
  console.log(tinyColor(colorAtom.value.color).darken(10).toHexString());
  return tinyColor(colorAtom.value.color).darken(10).toHexString();
});

const colors = ref(["#ff0000", "#00ff00", "#0000ff"]);
</script>
