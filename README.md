# backend

A micro-service based system built on top of [Zeit](https://zeit.co) using Node.js.

## Structure

Zeit passes http requests to `routes/index.js`. This file exports an Express app which is consumed by @now/node.
