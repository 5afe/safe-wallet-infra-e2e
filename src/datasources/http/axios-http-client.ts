import axios, { Axios } from 'axios';
import * as http from 'http';
import * as https from 'https';

const REQUEST_TIMEOUT_MS: number = 30_000;

export const httpClient: Axios = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
