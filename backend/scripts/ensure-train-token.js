// Fills an empty PREDICTION_TRAIN_TOKEN in backend/.env with a random secret.
// Run by Setup.bat after `.env` is copied from `.env.example`, so automatic
// model retraining (POST /train on the prediction service) works out of the
// box. An existing token is left untouched.
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
const EMPTY_TOKEN = /^PREDICTION_TRAIN_TOKEN=\s*$/m;

const env = readFileSync(ENV_PATH, "utf8");
if (EMPTY_TOKEN.test(env)) {
  const token = randomBytes(32).toString("base64url");
  writeFileSync(
    ENV_PATH,
    env.replace(EMPTY_TOKEN, `PREDICTION_TRAIN_TOKEN=${token}`),
  );
  console.info("PREDICTION_TRAIN_TOKEN generated in backend/.env");
}
