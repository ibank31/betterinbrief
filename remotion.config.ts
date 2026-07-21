import {Config} from "@remotion/cli/config";

Config.setConcurrency(1);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("swiftshader");
Config.setPublicDir("./app/remotion/public");
