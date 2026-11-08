var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// ../../opnduck/electron/core/platform.cjs
var require_platform = __commonJS({
  "../../opnduck/electron/core/platform.cjs"(exports2, module2) {
    var { EventEmitter } = require("node:events");
    var { spawn } = require("node:child_process");
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    function extraToolDirs(pathValue = process.env.PATH ?? "", platform2 = process.platform, home = os2.homedir()) {
      if (platform2 !== "darwin") return [];
      const have = new Set(pathValue.split(path2.delimiter));
      return ["/opt/homebrew/bin", "/opt/homebrew/sbin", "/usr/local/bin", path2.join(home, ".local", "bin"), path2.join(home, "Applications", "OPNduck-tools")].filter((d) => !have.has(d));
    }
    function fixPath() {
      const extra = extraToolDirs();
      if (extra.length) process.env.PATH = [...extra, process.env.PATH ?? ""].filter(Boolean).join(path2.delimiter);
    }
    function linuxOnBattery() {
      const base = "/sys/class/power_supply";
      try {
        const items = fs2.readdirSync(base).map((n) => ({ type: read(`${base}/${n}/type`), online: read(`${base}/${n}/online`), status: read(`${base}/${n}/status`) }));
        if (!items.some((i) => i.type === "Battery")) return false;
        if (items.some((i) => i.type === "Mains" && i.online === "1")) return false;
        return items.some((i) => i.type === "Battery" && i.status === "Discharging");
      } catch {
        return null;
      }
    }
    var read = (f) => {
      try {
        return fs2.readFileSync(f, "utf8").trim();
      } catch {
        return "";
      }
    };
    function systemActionCommand(kind, platform2 = process.platform) {
      if (platform2 === "win32") return kind === "sleep" ? ["rundll32.exe", ["powrprof.dll,SetSuspendState", "0,1,0"]] : ["shutdown", ["/s", "/t", "0"]];
      if (platform2 === "darwin") return kind === "sleep" ? ["pmset", ["sleepnow"]] : ["osascript", ["-e", 'tell application "System Events" to shut down']];
      return kind === "sleep" ? ["true", []] : ["true", []];
    }
    var APP_DIR = "opnduck-desktop";
    function userDataDir() {
      const home = os2.homedir();
      if (process.platform === "win32") return path2.join(process.env.APPDATA || path2.join(home, "AppData", "Roaming"), APP_DIR);
      if (process.platform === "darwin") return path2.join(home, "Library", "Application Support", APP_DIR);
      return path2.join(process.env.XDG_CONFIG_HOME || path2.join(home, ".config"), APP_DIR);
    }
    function detached(cmd, args) {
      try {
        const child = spawn(cmd, args, { stdio: "ignore", detached: true });
        child.on("error", () => {
        });
        child.unref();
      } catch {
      }
    }
    function createNodePlatform2(opts = {}) {
      const bus = new EventEmitter();
      const opener = process.platform === "win32" ? ["cmd", ["/c", "start", ""]] : process.platform === "darwin" ? ["open", []] : ["xdg-open", []];
      const open = (target) => detached(opener[0], [...opener[1], target]);
      return {
        paths: {
          userData: userDataDir(),
          downloads: path2.join(os2.homedir(), "Downloads"),
          documents: path2.join(os2.homedir(), "Documents")
        },
        /** Full path of a Python helper script that ships with the app. */
        scriptPath: (name) => path2.join(opts.scriptsDir ?? path2.join(__dirname, ".."), name),
        version: opts.version ?? "0.0.0",
        isPackaged: opts.isPackaged ?? false,
        /** Listen for events sent with emit(); returns an unsubscribe function. */
        on(channel, fn) {
          bus.on(channel, fn);
          return () => bus.off(channel, fn);
        },
        emit: (channel, payload) => void bus.emit(channel, payload),
        canNotify: () => true,
        notify({ title, body, onClick }) {
          process.stderr.write("\x07");
          if (process.platform === "linux") detached("notify-send", [title, body ?? ""]);
          void onClick;
          return true;
        },
        isFocused: () => false,
        isOnBattery: () => process.platform === "linux" ? linuxOnBattery() : null,
        idleSeconds: () => null,
        // a terminal app cannot tell
        canCountdown: () => false,
        // so it never sleeps or shuts down by itself
        systemAction: (kind) => detached(...systemActionCommand(kind)),
        openPath: open,
        showInFolder: (p) => open(path2.dirname(p)),
        openExternal: open
      };
    }
    module2.exports = { createNodePlatform: createNodePlatform2, userDataDir, linuxOnBattery, systemActionCommand, extraToolDirs, fixPath };
  }
});

// ../../opnduck/electron/mcp_tools.cjs
var require_mcp_tools = __commonJS({
  "../../opnduck/electron/mcp_tools.cjs"(exports2, module2) {
    var FILE = { type: "string", description: "Absolute path to an existing file on this computer." };
    var JOB_ID = { type: "string", description: "A job id from list_jobs or from a start tool." };
    var TOOLS2 = [
      {
        name: "download",
        description: "Download a video or audio from a URL with yt-dlp (YouTube, SoundCloud, Spotify links and similar). Returns a job id.",
        channel: "tasks:start",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "http(s) link to the media." },
            format: { type: "string", enum: ["MP4", "MP3", "MKV", "MOV", "FLAC", "WAV"], description: "Default MP4." },
            videoQuality: { type: "string", enum: ["best", "2160", "1440", "1080", "720", "480", "360"], description: "Default best." },
            audioQuality: { type: "string", enum: ["best", "320k", "192k", "128k"], description: "Default best." }
          },
          required: ["url"],
          additionalProperties: false
        }
      },
      {
        name: "convert",
        description: "Convert a media, image or document file to another format. Returns a job id.",
        channel: "tasks:startConvert",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            container: {
              type: "string",
              enum: ["MP4", "MKV", "WEBM", "MOV", "AVI", "GIF", "MP3", "FLAC", "WAV", "OGG", "M4A", "OPUS", "PDF", "DOCX", "ODT", "RTF", "TXT", "HTML", "PNG", "JPG", "WEBP", "AVIF", "BMP", "TIFF", "ICO"]
            },
            mode: { type: "string", enum: ["remux", "transcode"], description: "remux copies streams (fast); transcode re-encodes. Default transcode." }
          },
          required: ["inputPath", "container"],
          additionalProperties: false
        }
      },
      {
        name: "upscale_image",
        description: "Upscale an image with Real-ESRGAN. Returns a job id.",
        channel: "tasks:startUpscale",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            scale: { type: "integer", enum: [2, 3, 4], description: "Default 4." },
            model: { type: "string", enum: ["realesr-animevideov3", "realesrgan-x4plus", "realesrgan-x4plus-anime"], description: "Default realesr-animevideov3." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "upscale_video",
        description: "Upscale a video with Real-ESRGAN (GPU). Slow for long videos. Returns a job id.",
        channel: "tasks:startVideoUpscale",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            scale: { type: "integer", enum: [2, 3, 4], description: "Default 2." },
            model: { type: "string", enum: ["realesr-animevideov3", "realesrgan-x4plus", "realesrgan-x4plus-anime"], description: "Default realesr-animevideov3." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "interpolate",
        description: "Raise a video's frame rate with RIFE (2x or 4x). Returns a job id.",
        channel: "tasks:startInterpolate",
        inputSchema: {
          type: "object",
          properties: { inputPath: FILE, multiplier: { type: "integer", enum: [2, 4], description: "Default 2." } },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "subtitles",
        description: "Generate subtitles for a video or audio file with Whisper. Returns a job id.",
        channel: "tasks:startSubtitles",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            model: { type: "string", enum: ["tiny", "base", "small", "medium"], description: "Default tiny." },
            language: { type: "string", description: "'auto' or an ISO 639-1 code like 'en'. Default auto." },
            translate: { type: "boolean", description: "Translate to English. Default false." },
            format: { type: "string", enum: ["srt", "vtt"], description: "Default srt." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "trim",
        description: "Cut a section out of a video or audio file. Returns a job id.",
        channel: "tasks:startTrim",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            start: { type: "number", minimum: 0, description: "Seconds from the start." },
            end: { type: ["number", "null"], description: "Seconds; omit or null for the end of the file." },
            mode: { type: "string", enum: ["fast", "precise"], description: "fast copies streams (keyframe cuts); precise re-encodes. Default fast." }
          },
          required: ["inputPath", "start"],
          additionalProperties: false
        }
      },
      {
        name: "compress",
        description: "Make a video or audio file land just under a size (for example 10 MB for Discord). Returns a job id.",
        channel: "tasks:startCompress",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            targetMB: { type: "number", minimum: 0.5, description: "The size to stay under, in megabytes." },
            quality: { type: "string", enum: ["fast", "best"], description: "fast uses the GPU encoder when there is one; best is a slower two-pass x264 encode. Default fast." }
          },
          required: ["inputPath", "targetMB"],
          additionalProperties: false
        }
      },
      {
        name: "list_recipes",
        description: "List the saved recipes (chains of tools), with what each starts from and its steps. Read-only.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
      },
      {
        name: "run_recipe",
        description: "Run a saved recipe on a file (or a link, for a recipe that starts from a link). Each step feeds the next, and the steps show up as one group in the Library. Returns the run and job ids.",
        inputSchema: {
          type: "object",
          properties: {
            recipe: { type: "string", description: "The recipe id from list_recipes." },
            input: { type: "string", description: "An absolute file path, or a full http(s) link for a recipe that starts from a link." },
            keepIntermediate: { type: "boolean", description: "Keep the files the middle steps make. Default false." }
          },
          required: ["recipe", "input"],
          additionalProperties: false
        }
      },
      {
        name: "suggest_settings",
        description: "Look at a media file and suggest the best settings for a tool (model, scale, frame rate multiplier, remux or re-encode, subtitle model), with the reason for each. Read-only; does not start a job.",
        inputSchema: {
          type: "object",
          properties: {
            tool: { type: "string", enum: ["upscale_image", "upscale_video", "interpolate", "convert", "compress", "subtitles"], description: "The tool to suggest settings for." },
            inputPath: FILE,
            container: { type: "string", description: "For convert: the target format, such as MP4 or MKV." }
          },
          required: ["tool", "inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "make_gif",
        description: "Turn a section of a video into a GIF, an animated WebP, or a Telegram or Discord sticker (sizes and lengths are fitted to the sticker limits). Returns a job id.",
        channel: "tasks:startGif",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            preset: { type: "string", enum: ["gif", "webp", "telegram", "discord"], description: "gif, webp, telegram (WebM, 512 px, up to 3 s, 256 KB) or discord (APNG, 320 px, 512 KB). Default gif." },
            start: { type: "number", minimum: 0, description: "Seconds from the start. Default 0." },
            end: { type: ["number", "null"], description: "Seconds; omit or null for the preset limit after the start." },
            width: { type: "integer", minimum: 64, maximum: 1920, description: "Width in pixels for gif and webp. Default 480. Stickers use their own size." },
            fps: { type: "integer", minimum: 5, maximum: 30, description: "Frames per second. Default depends on the preset." },
            loop: { type: "boolean", description: "Loop forever (gif and webp). Default true." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "remove_background",
        description: "Cut the person or object out of a picture or video with no green screen, and put a transparent background (PNG, WebM or ProRes), a flat colour, a blurred copy or another picture behind it. Needs the Background Remover add-on. Returns a job id.",
        channel: "tasks:startBgRemove",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            output: { type: "string", enum: ["transparent", "color", "blur", "image"], description: "What goes behind. Default transparent." },
            color: { type: "string", description: "For output color: #rrggbb. Default #00ff00." },
            backgroundImage: { type: "string", description: "For output image: absolute path of the picture." },
            quality: { type: "string", enum: ["fast", "best"], description: "Video: fast (small model) or best (bigger model, slower). Default fast." },
            format: { type: "string", enum: ["webm", "mov"], description: "Transparent video: webm (VP9 with alpha) or mov (ProRes 4444). Default webm." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "dub_video",
        description: "Make a video speak another language, all on this computer: the voice is split from the music, written down, translated, spoken by a local voice and fitted into the timing, and the picture is not re-encoded. Needs the Dubbing add-on. Returns a job id.",
        channel: "tasks:startDub",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            target: { type: "string", enum: ["en", "sv", "de", "fr", "es", "it"], description: "The language to dub into." },
            source: { type: "string", description: "The spoken language as a code like 'en', or 'auto' to detect it. Default auto." },
            placement: { type: "string", enum: ["track", "replace"], description: "track adds the dub as the first audio track and keeps the original as a second; replace leaves only the dub. Default track." },
            keepOriginal: { type: "boolean", description: "Keep the original voice very quiet under the new one. Default false." },
            whisperModel: { type: "string", enum: ["tiny", "base", "small", "medium"], description: "Listening model: bigger is more accurate and slower. Default base." }
          },
          required: ["inputPath", "target"],
          additionalProperties: false
        }
      },
      {
        name: "grade",
        description: "Colour grade a video: automatic fixes measured from the picture (levels, brightness, colour cast), a look (warm_film, teal_orange, bleach_bypass, bw_rich, vintage_fade, cool_night, or the id of an imported or matched look), and sliders. HDR video is tone-mapped to SDR first. Returns a job id.",
        channel: "tasks:startGrade",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            auto: { type: "boolean", description: "Measure the video and fix levels, exposure and colour cast by rules. Default false." },
            look: { type: "string", description: "A look id, or leave out for none." },
            intensity: { type: "number", minimum: 0, maximum: 1, description: "How strongly the look applies, 0 to 1. Default 1." },
            exposure: { type: "number", minimum: -2, maximum: 2, description: "Stops brighter (positive) or darker. Default 0." },
            contrast: { type: "number", minimum: 0.5, maximum: 1.6, description: "Default 1." },
            saturation: { type: "number", minimum: 0, maximum: 2, description: "Default 1." },
            temperature: { type: "number", minimum: -1, maximum: 1, description: "Warmer (positive) or cooler. Default 0." },
            tint: { type: "number", minimum: -1, maximum: 1, description: "More magenta (positive) or more green. Default 0." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "beat_analyze",
        description: "Find the tempo (BPM), beat times and musical key of a song. Optionally writes the BPM and key into a tagged copy (MP3, FLAC, Ogg, Opus). Needs the Beat Finder install (librosa). Returns a job id; the BPM and key show in the job status.",
        channel: "tasks:startBeatAnalyze",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            writeTags: { type: "boolean", description: "Write BPM and key tags into a copy of the file. Default false." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "beat_cut",
        description: "Make a montage that switches clips on the beat of a song: cuts a list of video clips (or folders of them) every 1, 2, 4 or 8 beats, with the song as the sound. Returns a job id.",
        channel: "tasks:startBeatCut",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: { type: "string", description: "Absolute path to the song." },
            clips: { type: "array", items: { type: "string" }, description: "Absolute paths of video files or folders of videos, used in this order." },
            everyBeats: { type: "integer", enum: [1, 2, 4, 8], description: "Switch clip every this many beats. Default 4." },
            shuffle: { type: "boolean", description: "Use the clips in random order. Default false." },
            skipSeconds: { type: "number", minimum: 0, maximum: 30, description: "Seconds to skip at the start of every clip. Default 0." },
            beats: { type: "array", items: { type: "number" }, description: "Beat times in seconds (from an earlier analysis). Omit to analyse the song first." }
          },
          required: ["inputPath", "clips"],
          additionalProperties: false
        }
      },
      {
        name: "restore",
        description: "Clean up old or bad footage in one pass: deinterlace, denoise, stabilize and fix the colors. With upscale or interpolate the result then goes through the AI upscaler and the frame interpolator as follow-up jobs in the same group. Returns a job id.",
        channel: "tasks:startRestore",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            deinterlace: { type: "string", enum: ["auto", "on", "off"], description: "auto looks at the video and deinterlaces only when it is interlaced. Default auto." },
            denoise: { type: "string", enum: ["off", "light", "medium", "strong"], description: "Remove grain and noise. strong is slow. Default off." },
            stabilize: { type: "boolean", description: "Steady shaky footage (needs an FFmpeg with libvidstab). Default false." },
            fixColors: { type: "boolean", description: "Even out faded or dark footage with automatic levels. Default false." },
            upscale: { type: "boolean", description: "Then upscale 2x with the AI upscaler. Default false." },
            interpolate: { type: "boolean", description: "Then double the frame rate with RIFE. Default false." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "jump_cut",
        description: "Remove the silences from a talking video or a podcast (one re-encode), and/or even out the loudness. Returns a job id.",
        channel: "tasks:startJumpCut",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            cut: { type: "boolean", description: "Cut the silences. Default true." },
            thresholdDb: { type: "number", minimum: -80, maximum: -10, description: "Anything quieter than this is silence. Default -30." },
            minSilence: { type: "number", minimum: 0.1, maximum: 10, description: "Only silences at least this many seconds long are cut. Default 0.5." },
            padding: { type: "number", minimum: 0, maximum: 2, description: "Seconds of silence kept around each part. Default 0.15." },
            normalize: { type: "string", enum: ["off", "podcast", "broadcast"], description: "Even out the loudness: podcast (-14 LUFS, YouTube and Spotify) or broadcast (-23 LUFS). Default off." },
            audioOnly: { type: "boolean", description: "Write an MP3 without the video. Default false." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "tag_music",
        description: "Look up a song by its audio fingerprint (AcoustID, MusicBrainz, Cover Art Archive) and write artist, title, album, year, track and cover into the file. It changes the file only when it is sure enough. Returns a job id.",
        channel: "tasks:startTag",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            organize: { type: "boolean", description: "Also move the file to Artist/Album/ next to where it is. Default false." },
            minConfidence: { type: "number", minimum: 0.5, maximum: 1, description: "How sure the match must be before the file is changed, 0.5 to 1. Default 0.9." }
          },
          required: ["inputPath"],
          additionalProperties: false
        }
      },
      {
        name: "audio_ai",
        description: "Remove vocals / isolate the voice / clean up audio (Demucs, or ffmpeg for echo). Returns a job id.",
        channel: "tasks:startAudioAi",
        inputSchema: {
          type: "object",
          properties: {
            inputPath: FILE,
            mode: { type: "string", enum: ["no-vocals", "vocals", "voice", "echo"] },
            format: { type: "string", enum: ["MP3", "FLAC", "WAV"], description: "Default MP3." },
            keepVideo: { type: "boolean", description: "For videos: put the processed audio back on the picture." }
          },
          required: ["inputPath", "mode"],
          additionalProperties: false
        }
      },
      {
        name: "list_jobs",
        description: "List OPNduck jobs (newest last): id, kind, status, progress 0-1, label, error.",
        inputSchema: {
          type: "object",
          properties: { status: { type: "string", enum: ["queued", "running", "done", "error", "canceled"], description: "Only jobs with this status." } },
          additionalProperties: false
        }
      },
      {
        name: "job_status",
        description: "One job in detail, with its output file path (when done) and the last log lines.",
        inputSchema: {
          type: "object",
          properties: { id: JOB_ID, logLines: { type: "integer", minimum: 0, maximum: 200, description: "How many log lines. Default 20." } },
          required: ["id"],
          additionalProperties: false
        }
      },
      {
        name: "cancel_job",
        description: "Cancel a queued or running job.",
        inputSchema: { type: "object", properties: { id: JOB_ID }, required: ["id"], additionalProperties: false }
      },
      {
        name: "queue_pause",
        description: "Pause the job queue: running jobs finish, waiting jobs do not start.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
      },
      {
        name: "queue_resume",
        description: "Resume the job queue.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
      },
      {
        name: "probe_media",
        description: "Read a media file's duration, resolution and whether it has video. Read-only.",
        inputSchema: { type: "object", properties: { path: FILE }, required: ["path"], additionalProperties: false }
      }
    ];
    var AUDIO_CONTAINERS = ["MP3", "FLAC", "WAV", "OGG", "M4A", "OPUS"];
    var IMAGE_CONTAINERS = ["PNG", "JPG", "WEBP", "AVIF", "BMP", "TIFF", "ICO"];
    var same = (_args, inputType) => inputType;
    var STEP_TYPES = {
      download: { accepts: ["url"], produces: (a) => AUDIO_CONTAINERS.includes(String(a.format ?? DEFAULTS.download.format).toUpperCase()) ? "audio" : "video" },
      convert: { accepts: ["video", "audio", "image"], produces: (a) => AUDIO_CONTAINERS.includes(a.container) ? "audio" : IMAGE_CONTAINERS.includes(a.container) ? "image" : ["PDF", "DOCX", "ODT", "RTF", "TXT", "HTML"].includes(a.container) ? "document" : "video" },
      upscale_image: { accepts: ["image"], produces: "image" },
      upscale_video: { accepts: ["video"], produces: "video" },
      interpolate: { accepts: ["video"], produces: "video" },
      subtitles: { accepts: ["video", "audio"], produces: "subtitle" },
      trim: { accepts: ["video", "audio"], produces: same },
      compress: { accepts: ["video", "audio"], produces: same },
      make_gif: { accepts: ["video"], produces: "image" },
      remove_background: { accepts: ["video", "image"], produces: (a, inputType) => inputType },
      grade: { accepts: ["video"], produces: "video" },
      dub_video: { accepts: ["video"], produces: "video" },
      beat_analyze: { accepts: ["audio"], produces: "audio" },
      beat_cut: { accepts: [], produces: "video" },
      // takes a song and a list of clips: a job of its own, never a recipe step
      restore: { accepts: ["video"], produces: "video" },
      jump_cut: { accepts: ["video", "audio"], produces: (a, inputType) => a.audioOnly ? "audio" : inputType },
      tag_music: { accepts: ["audio"], produces: "audio" },
      audio_ai: { accepts: ["audio", "video"], produces: "audio" }
    };
    function producesFor(tool, args, inputType) {
      const t = STEP_TYPES[tool];
      if (!t) return null;
      return typeof t.produces === "function" ? t.produces(args ?? {}, inputType) : t.produces;
    }
    function publicTools() {
      return TOOLS2.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    }
    var DEFAULTS = {
      download: { format: "MP4", videoQuality: "best", audioQuality: "best", playlist: "single" },
      convert: { mode: "transcode" },
      upscale_image: { scale: 4, model: "realesr-animevideov3" },
      upscale_video: { scale: 2, model: "realesr-animevideov3" },
      interpolate: { multiplier: 2 },
      subtitles: { model: "tiny", language: "auto", translate: false, format: "srt" },
      trim: { end: null, mode: "fast" },
      compress: { quality: "fast" },
      make_gif: { preset: "gif", start: 0, end: null, loop: true },
      remove_background: { output: "transparent", quality: "fast", format: "webm" },
      grade: { auto: false },
      dub_video: { source: "auto", placement: "track", keepOriginal: false, whisperModel: "base" },
      beat_analyze: { writeTags: false },
      beat_cut: { everyBeats: 4, shuffle: false, skipSeconds: 0 },
      restore: { deinterlace: "auto", denoise: "off", stabilize: false, fixColors: false },
      jump_cut: { cut: true, normalize: "off", audioOnly: false },
      tag_music: { organize: false, minConfidence: 0.9 },
      audio_ai: { format: "MP3", keepVideo: false }
    };
    function buildStartRequest2(name, args) {
      const tool = TOOLS2.find((t) => t.name === name && t.channel);
      if (!tool) throw new Error(`Unknown start tool: ${name}`);
      const a = args == null ? {} : args;
      if (typeof a !== "object" || Array.isArray(a)) throw new Error("Arguments must be an object");
      const props = tool.inputSchema.properties;
      for (const key of Object.keys(a)) if (!Object.hasOwn(props, key)) throw new Error(`Unknown argument: ${key}`);
      for (const key of tool.inputSchema.required ?? []) if (a[key] == null) throw new Error(`Missing argument: ${key}`);
      const req = { ...DEFAULTS[name] ?? {} };
      for (const [key, value] of Object.entries(a)) {
        if (value === void 0) continue;
        const spec = props[key];
        const types = [].concat(spec.type);
        const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
        const ok = types.includes(actual) || actual === "integer" && types.includes("number");
        if (!ok) throw new Error(`Argument ${key} must be ${types.join(" or ")}`);
        if (spec.enum && !spec.enum.includes(value)) throw new Error(`Argument ${key} must be one of: ${spec.enum.join(", ")}`);
        if (Array.isArray(value) && (value.length > 5e3 || value.some((v) => (spec.items?.type ?? "string") !== typeof v && !(spec.items?.type === "integer" && Number.isInteger(v))))) throw new Error(`Argument ${key} must be a list of ${spec.items?.type ?? "string"}s (at most 5000)`);
        if (typeof value === "string" && value.length > 4096) throw new Error(`Argument ${key} is too long`);
        if (typeof value === "number" && (!Number.isFinite(value) || spec.minimum != null && value < spec.minimum || spec.maximum != null && value > spec.maximum)) throw new Error(`Argument ${key} is out of range`);
        req[key] = value;
      }
      return { channel: tool.channel, req };
    }
    module2.exports = { TOOLS: TOOLS2, DEFAULTS, STEP_TYPES, producesFor, publicTools, buildStartRequest: buildStartRequest2 };
  }
});

// ../../opnduck/electron/core/settings.cjs
var require_settings = __commonJS({
  "../../opnduck/electron/core/settings.cjs"(exports2, module2) {
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    var { userDataDir } = require_platform();
    var dataDir = userDataDir;
    function configure(platform2) {
      dataDir = () => platform2.paths.userData;
    }
    var COOKIE_BROWSERS = ["firefox", "chromium", "chrome", "edge", "brave", "opera", "vivaldi"];
    var DEFAULTS = {
      /** '' = no proxy. Otherwise http(s)/socks4/socks5 URL handed to yt-dlp --proxy. */
      proxy: "",
      /** GPU job threading for the upscaler/interpolator: 'auto' overlaps loading, processing and saving
       *  frames (faster); 'low' uses the tools' conservative defaults for GPUs with little memory. */
      gpuThreads: "auto",
      /** Video upscaling engine: 'auto' = PyTorch when it can run (faster, streams frames), else ncnn; 'ncnn' = always ncnn. */
      upscaleEngine: "auto",
      /** Desktop notification when jobs finish while the window isn't focused. */
      notifyOnFinish: true,
      /** Closing the window keeps OPNduck running in the system tray (subscriptions keep checking). */
      runInTray: false,
      /** Parallel yt-dlp downloads / ffmpeg+LibreOffice conversions. */
      /** Watch folder: new media files dropped in `path` are converted to `container` (into a "converted" subfolder). */
      watchFolder: { enabled: false, path: "", container: "MP4", recipe: "" },
      /** Smart scheduling for heavy jobs (conversions, GPU work, transcription); see core/schedule.cjs. Everything is off by default. */
      schedule: {
        window: false,
        from: "23:00",
        to: "07:00",
        // only start heavy jobs between these times
        battery: false,
        // hold heavy jobs while running on battery
        heat: false,
        maxC: 85,
        // pause GPU jobs above this temperature
        idle: false,
        idleMinutes: 10,
        // start heavy jobs only after this long away
        downloads: false,
        // the rules above also hold downloads
        whenDone: "nothing",
        // 'nothing' | 'notify' | 'sleep' | 'shutdown' once the queue is empty
        powerConfirmed: false
        // sleep and shut down stay off until the person has confirmed once in Settings
      },
      /** The AI runtime (see core/ai/): which model answers and how. Off until a provider is chosen. */
      ai: {
        provider: "off",
        // 'off' | 'local' (OPNduck's own model) | 'ollama' | 'lmstudio' | 'machine' (another computer) | 'cloud' (the person's own API key)
        model: "",
        machineUrl: "",
        // the other computer's OpenAI-compatible address
        cloud: "anthropic",
        customUrl: "",
        // for the "custom" cloud provider
        effort: "medium",
        // 'low' | 'medium' | 'high'
        reasoning: "auto",
        // 'auto' (from effort) | 'on' | 'off'
        vision: false,
        // send images to the model
        temperature: 0.7,
        keepChats: true,
        localModel: "ministral-3-3b",
        // for the 'local' provider
        context: 16384,
        // Chat sends about 5,000 tokens of tool descriptions with every question, so 8k runs out after a few turns
        ctxChosen: false,
        // true once the person picked a memory size themselves
        gpu: "auto",
        // 'auto' (all layers on the GPU) | 'cpu'
        startOnLaunch: false,
        idleEject: 15,
        // minutes without a question before the local model is ejected; 0 = never
        monthlyTokenLimit: 0,
        // cloud providers: stop at this many tokens a month; 0 = no limit
        dir: "",
        // where the local engine and models are kept; '' = the app's data folder
        /** Internet access for the assistant: a web search and reading pages. Off until turned on. */
        web: { enabled: false, search: "wikipedia", searxngUrl: "" }
        // search: 'wikipedia' | 'brave' (key in the AI keys) | 'searxng' | 'duckduckgo' (best effort)
      },
      maxDownloads: 3,
      maxConversions: 2,
      /** Encoder for AI video jobs: 'auto' = GPU (NVENC) when it works, 'cpu' = x264. */
      videoEncoder: "auto",
      /** Colours of the terminal app (a theme name such as 'blarange' or 'nord'). */
      tuiTheme: "blarange",
      /** Local MCP server so tools like Claude Code can start and watch jobs (see mcp.cjs). Off by default. */
      mcpServer: false,
      /** Start with every plugin skipped (applies on the next start). */
      pluginsSafeMode: false,
      /** Look up and tag new audio downloads by themselves (sends each song's fingerprint and title to AcoustID, MusicBrainz and the Cover Art Archive). Off until the user turns it on. */
      autoTagAudio: false,
      /** Send to OPNduck: accept links from other devices (off until turned on), and what happens when one arrives. */
      remoteEnabled: false,
      remoteMode: "ask",
      /** What a link sent from another device downloads as. Only the link comes from the sender; these are local choices. */
      /** Where the link server listens: off (default), this computer only, this computer and the Tailscale address, or the whole LAN. */
      /** Listen to the encrypted relay channel (ntfy) for links while Send to OPNduck is on. */
      remoteRelay: true,
      /** Let other OPNduck apps (and the phone app) use this computer's engine, through the same link server. */
      shareEngine: false,
      remoteBind: "off",
      remotePort: 47821,
      /** The https:// address Tailscale serves the link server on, once the user enabled it (goes into the pair link). */
      remoteDirectUrl: "",
      remoteFormat: "MP4",
      remoteVideoQuality: "best",
      remoteAudioQuality: "best",
      cookies: {
        /** 'none' | 'browser' (read from an installed browser) | 'file' (Netscape cookies.txt) |
         *  'login' (cookies saved from OPNduck's own sign-in window, see login.cjs). */
        mode: "none",
        browser: "firefox",
        /** Optional browser profile: a profile name, or an absolute folder (e.g. for Brave Origin). */
        profile: "",
        file: ""
      }
    };
    function loginCookieFile() {
      return path2.join(dataDir(), "login-cookies.txt");
    }
    function settingsFile() {
      return path2.join(dataDir(), "settings.json");
    }
    function validate(next) {
      if (typeof next.proxy !== "string") throw new Error("Proxy must be text");
      if (next.proxy !== "") {
        let u;
        try {
          u = new URL(next.proxy);
        } catch {
          throw new Error("Proxy must look like http://host:port or socks5://host:port");
        }
        if (!["http:", "https:", "socks4:", "socks4a:", "socks5:", "socks5h:"].includes(u.protocol) || !u.hostname) {
          throw new Error("Proxy must start with http://, https://, socks4:// or socks5://");
        }
      }
      if (!["auto", "low"].includes(next.gpuThreads)) throw new Error("Invalid GPU performance mode");
      if (!["auto", "ncnn"].includes(next.upscaleEngine)) throw new Error("Invalid upscale engine");
      if (!Number.isInteger(next.maxDownloads) || next.maxDownloads < 1 || next.maxDownloads > 6) throw new Error("Parallel downloads must be 1 to 6");
      if (!Number.isInteger(next.maxConversions) || next.maxConversions < 1 || next.maxConversions > 4) throw new Error("Parallel conversions must be 1 to 4");
      const w = next.watchFolder;
      if (!w || typeof w.enabled !== "boolean" || typeof w.path !== "string" || typeof w.container !== "string" || !/^[A-Z0-9]{2,5}$/.test(w.container)) throw new Error("Invalid watch folder");
      if (w.recipe !== void 0 && (typeof w.recipe !== "string" || w.recipe.length > 100)) throw new Error("Invalid watch folder recipe");
      if (w.path !== "" && !path2.isAbsolute(w.path)) throw new Error("The watch folder must be an absolute path");
      if (w.enabled && !w.path) throw new Error("Choose a folder to watch first");
      const ai = next.ai;
      if (!ai || typeof ai !== "object") throw new Error("Invalid AI setting");
      if (!["off", "local", "ollama", "lmstudio", "machine", "cloud"].includes(ai.provider)) throw new Error("Invalid AI provider");
      if (!["low", "medium", "high"].includes(ai.effort)) throw new Error("Effort must be low, medium or high");
      if (!["auto", "on", "off"].includes(ai.reasoning)) throw new Error("Reasoning must be auto, on or off");
      if (typeof ai.vision !== "boolean" || typeof ai.keepChats !== "boolean") throw new Error("Invalid AI setting");
      if (!Number.isFinite(ai.temperature) || ai.temperature < 0 || ai.temperature > 1.5) throw new Error("Temperature must be 0 to 1.5");
      if (!["ministral-3-3b", "qwen3-1.7b"].includes(ai.localModel)) throw new Error("Unknown local model");
      if (![4096, 8192, 16384, 32768].includes(ai.context)) throw new Error("Context must be 4096, 8192, 16384 or 32768");
      if (!["auto", "cpu"].includes(ai.gpu)) throw new Error("GPU must be auto or cpu");
      if (!Number.isInteger(ai.monthlyTokenLimit) || ai.monthlyTokenLimit < 0 || ai.monthlyTokenLimit > 1e9) throw new Error("The monthly limit must be 0 (none) or a number of tokens");
      if (typeof ai.startOnLaunch !== "boolean") throw new Error("Invalid AI setting");
      if (![0, 5, 15, 30, 60].includes(ai.idleEject)) throw new Error("Idle eject must be 0, 5, 15, 30 or 60 minutes");
      if (typeof ai.dir !== "string" || ai.dir !== "" && !path2.isAbsolute(ai.dir)) throw new Error("The AI folder must be an absolute path");
      for (const k of ["model", "machineUrl", "customUrl", "cloud"]) if (typeof ai[k] !== "string" || ai[k].length > 300) throw new Error(`Invalid AI ${k}`);
      for (const k of ["machineUrl", "customUrl"]) if (ai[k] && !/^https?:\/\/[^\s]+$/.test(ai[k])) throw new Error("Addresses start with https:// (or http:// on this computer or Tailscale)");
      const wb = ai.web;
      if (!wb || typeof wb.enabled !== "boolean" || !["wikipedia", "duckduckgo", "brave", "searxng"].includes(wb.search) || typeof wb.searxngUrl !== "string" || wb.searxngUrl.length > 300 || wb.searxngUrl && !/^https?:\/\/[^\s]+$/.test(wb.searxngUrl)) throw new Error("Invalid internet access setting");
      const sc = next.schedule;
      const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!sc || ["window", "battery", "heat", "idle", "downloads", "powerConfirmed"].some((k) => typeof sc[k] !== "boolean")) throw new Error("Invalid scheduling setting");
      if (!clock.test(sc.from) || !clock.test(sc.to)) throw new Error("Times look like 23:00");
      if (!Number.isInteger(sc.maxC) || sc.maxC < 60 || sc.maxC > 100) throw new Error("The temperature limit must be 60 to 100 \xB0C");
      if (!Number.isInteger(sc.idleMinutes) || sc.idleMinutes < 1 || sc.idleMinutes > 240) throw new Error("Away time must be 1 to 240 minutes");
      if (!["nothing", "notify", "sleep", "shutdown"].includes(sc.whenDone)) throw new Error('Invalid "when the queue finishes" setting');
      if (["sleep", "shutdown"].includes(sc.whenDone) && !sc.powerConfirmed) throw new Error("Confirm that OPNduck may sleep or shut down this computer first");
      if (typeof next.notifyOnFinish !== "boolean" || typeof next.runInTray !== "boolean") throw new Error("Invalid notification setting");
      if (!["auto", "cpu"].includes(next.videoEncoder)) throw new Error("Invalid video encoder");
      if (typeof next.mcpServer !== "boolean") throw new Error("Invalid MCP server setting");
      if (typeof next.pluginsSafeMode !== "boolean") throw new Error("Invalid plugin safe mode setting");
      if (typeof next.autoTagAudio !== "boolean") throw new Error("Invalid music tagging setting");
      if (typeof next.remoteEnabled !== "boolean") throw new Error("Invalid Send to OPNduck setting");
      if (!["ask", "auto"].includes(next.remoteMode)) throw new Error('"When a link arrives" must be ask or auto');
      if (typeof next.remoteRelay !== "boolean") throw new Error("Invalid relay setting");
      if (typeof next.shareEngine !== "boolean") throw new Error("Invalid engine sharing setting");
      if (!["off", "localhost", "tailscale", "lan"].includes(next.remoteBind)) throw new Error("Invalid link server setting");
      if (!Number.isInteger(next.remotePort) || next.remotePort < 1024 || next.remotePort > 65525) throw new Error("The link server port must be 1024 to 65525");
      if (typeof next.remoteDirectUrl !== "string" || next.remoteDirectUrl !== "" && !/^https:\/\/[a-z0-9.-]+(:\d{2,5})?$/i.test(next.remoteDirectUrl)) throw new Error("Invalid direct address");
      if (!["MP4", "MKV", "WEBM", "MOV", "AVI", "MP3", "FLAC", "WAV"].includes(next.remoteFormat)) throw new Error("Invalid format for links from other devices");
      if (typeof next.remoteVideoQuality !== "string" || !/^(best|\d{3,4})$/.test(next.remoteVideoQuality)) throw new Error("Invalid video quality for links from other devices");
      if (typeof next.remoteAudioQuality !== "string" || !/^(best|\d{1,3}k?)$/i.test(next.remoteAudioQuality)) throw new Error("Invalid audio quality for links from other devices");
      if (typeof next.tuiTheme !== "string" || !/^[a-z0-9-]{1,40}$/.test(next.tuiTheme)) throw new Error("Invalid terminal theme");
      const c = next.cookies;
      if (!c || !["none", "browser", "file", "login"].includes(c.mode)) throw new Error("Invalid cookie source");
      if (!COOKIE_BROWSERS.includes(c.browser)) throw new Error("Unsupported browser for cookies");
      if (typeof c.profile !== "string" || c.profile.includes("::") || /[\0\r\n]/.test(c.profile)) {
        throw new Error("Invalid browser profile");
      }
      if (c.profile !== "" && !/^[A-Za-z0-9 ._-]+$/.test(c.profile) && !path2.isAbsolute(c.profile)) {
        throw new Error("A browser profile must be a plain name or an absolute folder path");
      }
      if (c.mode === "file" && (typeof c.file !== "string" || !path2.isAbsolute(c.file))) {
        throw new Error("The cookies file must be an absolute path");
      }
    }
    var cache = null;
    function read() {
      if (cache) return cache;
      let stored = {};
      try {
        const parsed = JSON.parse(fs2.readFileSync(settingsFile(), "utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed;
      } catch {
      }
      const merged = { ...DEFAULTS, ...stored, cookies: { ...DEFAULTS.cookies, ...stored.cookies || {} }, schedule: { ...DEFAULTS.schedule, ...stored.schedule || {} }, ai: { ...DEFAULTS.ai, ...stored.ai || {} } };
      if (merged.ai.context === 8192 && !merged.ai.ctxChosen) merged.ai.context = 16384;
      try {
        validate(merged);
        cache = merged;
      } catch {
        cache = structuredClone(DEFAULTS);
      }
      return cache;
    }
    function getSettings() {
      return structuredClone(read());
    }
    function setSettings(patch) {
      if (!patch || typeof patch !== "object") throw new Error("Invalid settings update");
      const current = read();
      const next = {
        proxy: patch.proxy !== void 0 ? String(patch.proxy).trim() : current.proxy,
        gpuThreads: patch.gpuThreads !== void 0 ? patch.gpuThreads : current.gpuThreads,
        upscaleEngine: patch.upscaleEngine !== void 0 ? patch.upscaleEngine : current.upscaleEngine,
        notifyOnFinish: patch.notifyOnFinish !== void 0 ? patch.notifyOnFinish : current.notifyOnFinish,
        runInTray: patch.runInTray !== void 0 ? patch.runInTray : current.runInTray,
        ai: patch.ai !== void 0 ? { ...current.ai, ...patch.ai } : current.ai,
        schedule: patch.schedule !== void 0 ? { ...current.schedule, ...patch.schedule } : current.schedule,
        watchFolder: patch.watchFolder !== void 0 ? { ...current.watchFolder, ...patch.watchFolder } : current.watchFolder,
        maxDownloads: patch.maxDownloads !== void 0 ? patch.maxDownloads : current.maxDownloads,
        maxConversions: patch.maxConversions !== void 0 ? patch.maxConversions : current.maxConversions,
        videoEncoder: patch.videoEncoder !== void 0 ? patch.videoEncoder : current.videoEncoder,
        mcpServer: patch.mcpServer !== void 0 ? patch.mcpServer : current.mcpServer,
        pluginsSafeMode: patch.pluginsSafeMode !== void 0 ? patch.pluginsSafeMode : current.pluginsSafeMode,
        autoTagAudio: patch.autoTagAudio !== void 0 ? patch.autoTagAudio : current.autoTagAudio,
        remoteEnabled: patch.remoteEnabled !== void 0 ? patch.remoteEnabled : current.remoteEnabled,
        remoteMode: patch.remoteMode !== void 0 ? patch.remoteMode : current.remoteMode,
        remoteRelay: patch.remoteRelay !== void 0 ? patch.remoteRelay : current.remoteRelay,
        shareEngine: patch.shareEngine !== void 0 ? patch.shareEngine : current.shareEngine,
        remoteBind: patch.remoteBind !== void 0 ? patch.remoteBind : current.remoteBind,
        remotePort: patch.remotePort !== void 0 ? patch.remotePort : current.remotePort,
        remoteDirectUrl: patch.remoteDirectUrl !== void 0 ? patch.remoteDirectUrl : current.remoteDirectUrl,
        remoteFormat: patch.remoteFormat !== void 0 ? patch.remoteFormat : current.remoteFormat,
        remoteVideoQuality: patch.remoteVideoQuality !== void 0 ? patch.remoteVideoQuality : current.remoteVideoQuality,
        remoteAudioQuality: patch.remoteAudioQuality !== void 0 ? patch.remoteAudioQuality : current.remoteAudioQuality,
        tuiTheme: patch.tuiTheme !== void 0 ? patch.tuiTheme : current.tuiTheme,
        cookies: { ...current.cookies, ...patch.cookies && typeof patch.cookies === "object" ? patch.cookies : {} }
      };
      validate(next);
      cache = next;
      const file = settingsFile();
      fs2.mkdirSync(path2.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs2.writeFileSync(tmp, JSON.stringify(next, null, 2));
      fs2.renameSync(tmp, file);
      return getSettings();
    }
    function ytdlpBaseArgs() {
      const s = read();
      const args = ["--encoding", "utf-8"];
      if (s.proxy) args.push("--proxy", s.proxy);
      if (s.cookies.mode === "browser") {
        args.push("--cookies-from-browser", s.cookies.profile ? `${s.cookies.browser}:${s.cookies.profile}` : s.cookies.browser);
      } else if (s.cookies.mode === "file" && s.cookies.file) args.push("--cookies", s.cookies.file);
      else if (s.cookies.mode === "login" && fs2.existsSync(loginCookieFile())) args.push("--cookies", loginCookieFile());
      return args;
    }
    function hasCookies() {
      const s = read();
      return s.cookies.mode === "browser" || s.cookies.mode === "file" && !!s.cookies.file || s.cookies.mode === "login" && fs2.existsSync(loginCookieFile());
    }
    module2.exports = { validate, configure, getSettings, setSettings, ytdlpBaseArgs, hasCookies, loginCookieFile };
  }
});

// ../../opnduck/electron/core/tools.cjs
var require_tools = __commonJS({
  "../../opnduck/electron/core/tools.cjs"(exports2, module2) {
    var { spawn } = require("node:child_process");
    var crypto2 = require("node:crypto");
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    function createTools(platform2) {
      function ytDlpInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        if (process.platform === "darwin") return "install it with your package manager";
        return "install yt-dlp with your package manager";
      }
      const YTDLP_ASSET = process.platform === "win32" ? "yt-dlp.exe" : process.platform === "darwin" ? "yt-dlp_macos" : "yt-dlp_linux";
      const YTDLP_RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/";
      function managedYtDlpPath() {
        return path2.join(platform2.paths.userData, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
      }
      function ytdlpCommand() {
        const managed = managedYtDlpPath();
        return fs2.existsSync(managed) ? managed : "yt-dlp";
      }
      let ytdlpInstalling = false;
      function libreOfficeInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        if (process.platform === "darwin") return "install it with your package manager";
        return "install libreoffice-fresh with your package manager";
      }
      function sofficeCommand() {
        if (process.platform === "darwin") {
          const app = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
          return fs2.existsSync(app) ? app : "soffice";
        }
        if (process.platform !== "win32") return "soffice";
        for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]) {
          if (!base) continue;
          const candidate = path2.join(base, "LibreOffice", "program", "soffice.com");
          if (fs2.existsSync(candidate)) return candidate;
        }
        return "soffice";
      }
      function fpcalcInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        if (process.platform === "darwin") return "install it with your package manager";
        return "install chromaprint with your package manager";
      }
      function ffmpegInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        if (process.platform === "darwin") return "install it with your package manager";
        return "install ffmpeg with your package manager";
      }
      function realesrganInstallHint() {
        if (process.platform === "linux") return "install it with your package manager";
        if (process.platform === "darwin") return "Download the -macos zip from https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases and put the program in ~/Applications/OPNduck-tools/ (or anywhere on your PATH)";
        return "Download from https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases";
      }
      function rifeInstallHint() {
        if (process.platform === "linux") return "install it with your package manager";
        if (process.platform === "darwin") return "Download the -macos zip from https://github.com/nihui/rife-ncnn-vulkan/releases and put the program in ~/Applications/OPNduck-tools/ (or anywhere on your PATH)";
        return "Download from https://github.com/nihui/rife-ncnn-vulkan/releases";
      }
      function pythonCommand() {
        return process.env.OPNDUCK_PYTHON || (process.platform === "win32" ? "python" : "python3");
      }
      const VENV_DIR = process.env.OPNDUCK_VENV || path2.join(os2.homedir(), process.platform === "win32" ? "opnduck-venv" : ".opnduck-venv");
      const VENV_PYTHON = path2.join(VENV_DIR, ...process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]);
      function demucsPython() {
        if (process.env.OPNDUCK_PYTHON) return process.env.OPNDUCK_PYTHON;
        return fs2.existsSync(VENV_PYTHON) ? VENV_PYTHON : pythonCommand();
      }
      function venvHasPackage(name) {
        try {
          const libs = process.platform === "win32" ? [path2.join(VENV_DIR, "Lib")] : fs2.readdirSync(path2.join(VENV_DIR, "lib")).map((d) => path2.join(VENV_DIR, "lib", d));
          return libs.some((lib) => fs2.existsSync(path2.join(lib, "site-packages", name)));
        } catch {
          return false;
        }
      }
      let nvidiaPresent = null;
      function hasNvidiaGpu() {
        nvidiaPresent ??= (() => {
          try {
            return require("node:child_process").spawnSync("nvidia-smi", ["-L"], { timeout: 4e3 }).status === 0;
          } catch {
            return false;
          }
        })();
        return nvidiaPresent;
      }
      let engineDisk = null;
      const engineChecks = /* @__PURE__ */ new Map();
      const engineCacheFile = () => path2.join(platform2.paths.userData, "engine-cache.json");
      function loadEngineDisk() {
        if (engineDisk) return engineDisk;
        try {
          const parsed = JSON.parse(fs2.readFileSync(engineCacheFile(), "utf8"));
          engineDisk = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch {
          engineDisk = {};
        }
        return engineDisk;
      }
      function saveEngineDisk() {
        try {
          const file = engineCacheFile();
          fs2.mkdirSync(path2.dirname(file), { recursive: true });
          fs2.writeFileSync(`${file}.tmp`, JSON.stringify(engineDisk));
          fs2.renameSync(`${file}.tmp`, file);
        } catch {
        }
      }
      function venvFingerprint() {
        try {
          const lib = process.platform === "win32" ? path2.join(VENV_DIR, "Lib") : path2.join(VENV_DIR, "lib", fs2.readdirSync(path2.join(VENV_DIR, "lib")).find((d) => d.startsWith("python")) ?? "");
          return String(fs2.statSync(path2.join(lib, "site-packages")).mtimeMs);
        } catch {
          return "no-venv";
        }
      }
      function pythonCheck(python, code) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn(python, ["-c", code], { cwd: pythonCwd() });
          } catch {
            resolve(false);
            return;
          }
          child.on("error", () => resolve(false));
          child.on("close", (exit) => resolve(exit === 0));
        });
      }
      function cachedEngineCheck(key, python, code) {
        const fp = `${python}|${venvFingerprint()}`;
        const hit = engineChecks.get(key);
        if (hit && hit.fp === fp) return hit.promise;
        const refresh = () => pythonCheck(python, code).then((value) => {
          loadEngineDisk()[key] = { fp, value };
          saveEngineDisk();
          engineChecks.set(key, { fp, promise: Promise.resolve(value) });
          return value;
        });
        const saved = loadEngineDisk()[key];
        let promise;
        if (saved && saved.fp === fp && typeof saved.value === "boolean") {
          promise = Promise.resolve(saved.value);
          void refresh();
        } else promise = refresh();
        engineChecks.set(key, { fp, promise });
        return promise;
      }
      function clearEngineCache() {
        engineChecks.clear();
        engineDisk = {};
        try {
          fs2.rmSync(engineCacheFile(), { force: true });
        } catch {
        }
      }
      function venvNvidiaLibDirs() {
        try {
          const site = process.platform === "win32" ? path2.join(VENV_DIR, "Lib", "site-packages") : path2.join(VENV_DIR, "lib", fs2.readdirSync(path2.join(VENV_DIR, "lib")).find((d) => d.startsWith("python")) ?? "", "site-packages");
          const root = path2.join(site, "nvidia");
          const sub = process.platform === "win32" ? "bin" : "lib";
          const dirs = fs2.readdirSync(root).map((d) => path2.join(root, d, sub)).filter((d) => fs2.existsSync(d));
          const hasCublas12 = dirs.some((d) => fs2.readdirSync(d).some((f) => /^(lib)?cublas(64_12\.dll|\.so\.12)/.test(f)));
          return hasCublas12 ? dirs : [];
        } catch {
          return [];
        }
      }
      function whisperPython() {
        if (process.env.OPNDUCK_PYTHON) return process.env.OPNDUCK_PYTHON;
        return venvHasPackage("faster_whisper") ? VENV_PYTHON : pythonCommand();
      }
      function fasterWhisperInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        if (process.platform === "darwin") return "install it with your package manager";
        return "install it with your package manager";
      }
      function pythonCwd() {
        const dir = platform2.paths.userData;
        fs2.mkdirSync(dir, { recursive: true });
        return dir;
      }
      function demucsInstallHint() {
        if (process.platform === "win32") return "install it with your package manager";
        return "install it with your package manager";
      }
      const INSTALL_PACKAGES = {
        demucs: ["torch", "demucs", "soundfile"],
        whisper: ["faster-whisper"],
        torch: ["torch", "numpy"],
        // the fast video upscaling engine (CUDA PyTorch)
        dub: ["torch", "demucs", "soundfile", "faster-whisper", "argostranslate", "piper-tts", "numpy"],
        bgremove: ["rembg", "onnxruntime", "torchvision", "pillow", "numpy"],
        // Background Remover (torch is already there for the upscaler)
        beats: ["librosa", "soundfile"],
        // Beat Finder: tempo, beats and key (small, no PyTorch)
        "whisper-gpu": ["faster-whisper", "nvidia-cublas-cu12", "nvidia-cudnn-cu12"]
      };
      let installChild = null;
      function checkYtDlp() {
        return new Promise((resolve) => {
          const managed = ytdlpCommand() !== "yt-dlp";
          const done = (available, version) => resolve({ available, installHint: ytDlpInstallHint(), version, managed });
          let child;
          try {
            child = spawn(ytdlpCommand(), ["--version"]);
          } catch {
            done(false);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => out += c);
          child.on("error", () => done(false));
          child.on("close", (code) => done(code === 0, code === 0 ? out.trim() : void 0));
        });
      }
      async function installYtDlp() {
        if (ytdlpInstalling) return { ok: false, error: "An update is already running." };
        ytdlpInstalling = true;
        const dest = managedYtDlpPath();
        const tmp = `${dest}.download`;
        try {
          const get = async (url) => {
            const res = await fetch(url, { signal: AbortSignal.timeout(12e4) });
            if (!res.ok) throw new Error(`Download failed (${res.status}).`);
            if (new URL(res.url).protocol !== "https:") throw new Error("Unexpected download location.");
            return Buffer.from(await res.arrayBuffer());
          };
          const sums = (await get(YTDLP_RELEASE + "SHA2-256SUMS")).toString("utf8");
          const want = sums.split("\n").map((l) => l.trim().split(/\s+/)).find((p) => p[1] === YTDLP_ASSET)?.[0];
          if (!want) throw new Error("Couldn't find the checksum for this platform.");
          const bin = await get(YTDLP_RELEASE + YTDLP_ASSET);
          if (crypto2.createHash("sha256").update(bin).digest("hex") !== want) throw new Error("The download failed its checksum, so it was discarded.");
          fs2.mkdirSync(path2.dirname(dest), { recursive: true });
          fs2.writeFileSync(tmp, bin, { mode: 493 });
          fs2.renameSync(tmp, dest);
          return { ok: true };
        } catch (err) {
          fs2.rmSync(tmp, { force: true });
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        } finally {
          ytdlpInstalling = false;
        }
      }
      function checkLibreOffice() {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn(sofficeCommand(), ["--version"]);
          } catch {
            resolve({ available: false, installHint: libreOfficeInstallHint() });
            return;
          }
          child.on("error", () => resolve({ available: false, installHint: libreOfficeInstallHint() }));
          child.on("close", (code) => resolve({ available: code === 0, installHint: libreOfficeInstallHint() }));
        });
      }
      function checkFfmpeg() {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffmpeg", ["-version"]);
          } catch {
            resolve({ available: false, installHint: ffmpegInstallHint() });
            return;
          }
          child.on("error", () => resolve({ available: false, installHint: ffmpegInstallHint() }));
          child.on("close", (code) => resolve({ available: code === 0, installHint: ffmpegInstallHint() }));
        });
      }
      function checkFpcalc() {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("fpcalc", ["-version"]);
          } catch {
            resolve({ available: false, installHint: fpcalcInstallHint() });
            return;
          }
          child.on("error", () => resolve({ available: false, installHint: fpcalcInstallHint() }));
          child.on("close", (code) => resolve({ available: code === 0, installHint: fpcalcInstallHint() }));
        });
      }
      function checkRealesrgan() {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("realesrgan-ncnn-vulkan", ["-h"]);
          } catch {
            resolve({ available: false, installHint: realesrganInstallHint() });
            return;
          }
          child.on("error", () => resolve({ available: false, installHint: realesrganInstallHint() }));
          child.on("close", () => resolve({ available: true, installHint: realesrganInstallHint() }));
        });
      }
      function checkRife() {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("rife-ncnn-vulkan", ["-h"]);
          } catch {
            resolve({ available: false, installHint: rifeInstallHint() });
            return;
          }
          child.on("error", () => resolve({ available: false, installHint: rifeInstallHint() }));
          child.on("close", () => resolve({ available: true, installHint: rifeInstallHint() }));
        });
      }
      async function checkTorchEngine(ready) {
        return { available: await ready(), nvidia: hasNvidiaGpu() };
      }
      async function checkDemucs() {
        return {
          available: await cachedEngineCheck("demucs", demucsPython(), "import torch, demucs, soundfile"),
          installHint: demucsInstallHint()
        };
      }
      async function checkDub() {
        return { available: await cachedEngineCheck("dub", demucsPython(), "import faster_whisper, argostranslate, piper, demucs"), installHint: "install it with your package manager" };
      }
      async function checkBgRemove() {
        return { available: await cachedEngineCheck("bgremove", demucsPython(), "import rembg, torchvision, PIL"), installHint: "install it with your package manager" };
      }
      async function checkBeats() {
        return { available: await cachedEngineCheck("beats", demucsPython(), "import librosa, soundfile"), installHint: "install it with your package manager" };
      }
      async function checkFasterWhisper() {
        const available = await cachedEngineCheck("whisper", whisperPython(), "import faster_whisper");
        return { available, installHint: fasterWhisperInstallHint(), nvidia: hasNvidiaGpu(), gpu: venvNvidiaLibDirs().length > 0 };
      }
      function installTool(tool, send2) {
        if (!Object.hasOwn(INSTALL_PACKAGES, tool)) return { ok: false, error: "Unknown tool." };
        if (process.env.OPNDUCK_PYTHON) return { ok: false, error: "OPNDUCK_PYTHON is set, so OPNduck is not managing Python packages. Install them in that Python yourself." };
        if (installChild) return { ok: false, error: "An install is already running." };
        const run = (cmd, args) => new Promise((resolve) => {
          let child;
          try {
            child = spawn(cmd, args, { cwd: pythonCwd(), env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: "1", PYTHONUNBUFFERED: "1" } });
          } catch (err) {
            resolve({ code: -1, tail: String(err.message ?? err) });
            return;
          }
          installChild = child;
          let tail = "";
          const onData = (chunk) => {
            for (const raw of String(chunk).split(/\r?\n|\r/)) {
              const line = raw.trim();
              if (!line) continue;
              tail = (tail + "\n" + line).slice(-600);
              send2(line.slice(0, 200));
            }
          };
          child.stdout.on("data", onData);
          child.stderr.on("data", onData);
          child.on("error", (err) => resolve({ code: -1, tail: String(err.message ?? err) }));
          child.on("close", (code, signal) => resolve({ code: signal ? -2 : code, tail }));
        });
        return (async () => {
          try {
            if (!fs2.existsSync(VENV_PYTHON)) {
              send2("Creating the OPNduck Python environment\u2026");
              const made = await run(pythonCommand(), ["-m", "venv", VENV_DIR]);
              if (made.code === -2) return { ok: false, error: "Canceled." };
              if (made.code !== 0) return { ok: false, error: `Couldn't create a Python environment (is Python 3 installed?)
${made.tail}` };
            }
            send2("Installing packages\u2026");
            const res = await run(VENV_PYTHON, ["-m", "pip", "install", "--progress-bar", "off", ...INSTALL_PACKAGES[tool]]);
            if (res.code === -2) return { ok: false, error: "Canceled." };
            if (res.code !== 0) return { ok: false, error: `pip failed:
${res.tail}` };
            clearEngineCache();
            return { ok: true };
          } finally {
            installChild = null;
          }
        })();
      }
      function cancelInstall() {
        installChild?.kill();
      }
      return {
        ytDlpInstallHint,
        ffmpegInstallHint,
        libreOfficeInstallHint,
        realesrganInstallHint,
        rifeInstallHint,
        fasterWhisperInstallHint,
        demucsInstallHint,
        managedYtDlpPath,
        ytdlpCommand,
        sofficeCommand,
        pythonCommand,
        demucsPython,
        whisperPython,
        pythonCwd,
        venvHasPackage,
        hasNvidiaGpu,
        venvNvidiaLibDirs,
        cachedEngineCheck,
        clearEngineCache,
        VENV_DIR,
        VENV_PYTHON,
        checkYtDlp,
        installYtDlp,
        checkLibreOffice,
        checkFfmpeg,
        checkFpcalc,
        fpcalcInstallHint,
        checkRealesrgan,
        checkRife,
        checkBeats,
        checkBgRemove,
        checkDub,
        checkTorchEngine,
        checkDemucs,
        checkFasterWhisper,
        installTool,
        cancelInstall
      };
    }
    module2.exports = { createTools };
  }
});

// ../../opnduck/electron/core/redact.cjs
var require_redact = __commonJS({
  "../../opnduck/electron/core/redact.cjs"(exports2, module2) {
    var LINK_LOGIN = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@"'\\]+@/gi;
    function stripLinkLogin(text) {
      return typeof text === "string" ? text.replace(LINK_LOGIN, "$1") : text;
    }
    function stripLinkLoginDeep(value) {
      return JSON.parse(stripLinkLogin(JSON.stringify(value)));
    }
    module2.exports = { stripLinkLogin, stripLinkLoginDeep };
  }
});

// ../../opnduck/electron/core/tasks.cjs
var require_tasks = __commonJS({
  "../../opnduck/electron/core/tasks.cjs"(exports2, module2) {
    var { stripLinkLogin, stripLinkLoginDeep } = require_redact();
    var { spawn } = require("node:child_process");
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    function createTaskEngine({ platform: platform2, getSettings, onFinished }) {
      const tasks = /* @__PURE__ */ new Map();
      function addTask(id, entry) {
        entry.state.createdAt = Date.now();
        tasks.set(id, entry);
        historyChanged = true;
      }
      const LOG_MAX_LINES = 400;
      const LOG_NOISE = /^ffmpeg version |^\s+(built with|configuration:|lib\w+\s+\d)|^(frame|fps|stream_\d+_\d+_q|bitrate|total_size|out_time_us|out_time_ms|out_time|dup_frames|drop_frames|speed|progress)=|^\s*\d+(\.\d+)?%\s*$/;
      const logWatched = /* @__PURE__ */ new Set();
      const logPending = /* @__PURE__ */ new Map();
      let logTimer = null;
      function appendLog(id, chunk, stream = "o") {
        const entry = tasks.get(id);
        if (!entry) return;
        entry.log ??= { lines: [], partial: { o: "", e: "" } };
        const log = entry.log;
        const parts = (log.partial[stream] + String(chunk)).split(/\r?\n|\r/);
        log.partial[stream] = parts.pop() ?? "";
        for (const raw of parts) {
          const line = stripLinkLogin(raw.replace(/\s+$/, "")).slice(0, 300);
          if (!line || LOG_NOISE.test(line)) continue;
          const isPct = /^\[download\]\s+\d/.test(line);
          const replace = isPct && /^\[download\]\s+\d/.test(log.lines[log.lines.length - 1] ?? "");
          if (replace) log.lines[log.lines.length - 1] = line;
          else log.lines.push(line);
          if (log.lines.length > LOG_MAX_LINES) log.lines.splice(0, log.lines.length - LOG_MAX_LINES);
          if (logWatched.has(id)) {
            const pend = logPending.get(id) ?? { lines: [], replaceLast: false };
            if (replace && !pend.lines.length) pend.replaceLast = true;
            else if (replace) pend.lines[pend.lines.length - 1] = line;
            if (!replace) pend.lines.push(line);
            logPending.set(id, pend);
          }
        }
        if (logWatched.has(id) && logPending.size && !logTimer) {
          logTimer = setTimeout(() => {
            logTimer = null;
            for (const [tid, pend] of logPending) {
              platform2.emit("tasks:log", { id: tid, ...pend });
            }
            logPending.clear();
          }, 120);
        }
      }
      const jobLog = (id, text) => appendLog(id, text + "\n");
      function attachLog(child, id) {
        child.stdout?.on("data", (c) => appendLog(id, c, "o"));
        child.stderr?.on("data", (c) => appendLog(id, c, "e"));
      }
      function defaultDownloadDir() {
        return path2.join(platform2.paths.downloads, "OPNduck");
      }
      let broadcastTimer = null;
      function updateTaskbarProgress(active) {
        const value = active.length ? active.reduce((sum, s) => sum + (s.progress || 0), 0) / active.length : -1;
        platform2.setProgress?.(value < 0 ? -1 : Math.min(1, Math.max(0, value)));
      }
      let historyChanged = true;
      function broadcastTasks() {
        if (broadcastTimer) return;
        broadcastTimer = setTimeout(() => {
          broadcastTimer = null;
          const all = [...tasks.values()].map((t) => t.state);
          const active = all.filter((s) => !TERMINAL.includes(s.status));
          updateTaskbarProgress(active);
          const full = historyChanged || all.length !== lastSentCount;
          historyChanged = false;
          lastSentCount = all.length;
          const payload = { full, tasks: full ? all : active };
          platform2.emit("tasks:update", payload);
        }, 120);
      }
      let lastSentCount = -1;
      const TERMINAL = ["done", "error", "canceled"];
      const MAX_HISTORY = 500;
      const startHandlers = /* @__PURE__ */ new Map();
      function historyFile() {
        return path2.join(platform2.paths.userData, "history.json");
      }
      let saveTimer = null;
      function scheduleHistorySave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveHistory, 400);
      }
      function saveHistory() {
        clearTimeout(saveTimer);
        try {
          const finished = [...tasks.values()].filter((t) => TERMINAL.includes(t.state.status) && t.channel).slice(-MAX_HISTORY).map((t) => stripLinkLoginDeep({ state: t.state, channel: t.channel, req: t.req, finalPath: t.finalPath ?? null }));
          fs2.mkdirSync(path2.dirname(historyFile()), { recursive: true });
          const tmp = `${historyFile()}.tmp`;
          fs2.writeFileSync(tmp, JSON.stringify(finished));
          fs2.renameSync(tmp, historyFile());
        } catch {
        }
      }
      function loadHistory() {
        try {
          const rows = JSON.parse(fs2.readFileSync(historyFile(), "utf8"));
          if (!Array.isArray(rows)) return;
          for (const r of rows.slice(-MAX_HISTORY)) {
            if (typeof r?.state?.id !== "string" || !TERMINAL.includes(r.state.status)) continue;
            tasks.set(r.state.id, { state: r.state, child: null, finalPath: r.finalPath, channel: r.channel, req: r.req });
          }
        } catch {
        }
      }
      function sanitizeBatch(b) {
        if (!b || typeof b !== "object") return null;
        const { id, label, size } = b;
        if (typeof id !== "string" || id.length < 1 || id.length > 80) return null;
        if (typeof label !== "string" || label.length > 120) return null;
        if (!Number.isInteger(size) || size < 2 || size > 1e3) return null;
        return { id, label, size };
      }
      function wrapStart(channel, fn) {
        const wrapped = async (e, req) => {
          const id = await fn(e, req);
          const entry = tasks.get(id);
          if (entry) {
            entry.channel = channel;
            entry.req = req;
            const group = sanitizeBatch(req?.batch);
            if (group || !entry.state.group) entry.state.group = group;
            broadcastTasks();
          }
          return id;
        };
        startHandlers.set(channel, wrapped);
        return wrapped;
      }
      function updateTask(id, patch) {
        const entry = tasks.get(id);
        if (!entry) return;
        if (patch.status && TERMINAL.includes(entry.state.status)) return;
        if (typeof patch.progress === "number" && !patch.status && entry.state.status === "running") {
          patch = { ...patch, progress: Math.max(entry.state.progress, patch.progress) };
        }
        Object.assign(entry.state, patch);
        if (patch.status && patch.status !== "canceled" && TERMINAL.includes(patch.status)) onFinished(entry.state, entry.req);
        if (TERMINAL.includes(entry.state.status)) {
          historyChanged = true;
          scheduleHistorySave();
        }
        if (entry.releaseSlot && TERMINAL.includes(entry.state.status)) entry.releaseSlot();
        if (entry.state.status !== "done" && entry.finalPath && TERMINAL.includes(entry.state.status)) {
          try {
            if (fs2.statSync(entry.finalPath).size === 0) fs2.rmSync(entry.finalPath, { force: true });
          } catch {
          }
        }
        if (entry.onDone && TERMINAL.includes(entry.state.status)) {
          const cb = entry.onDone;
          entry.onDone = null;
          cb(entry.state);
        }
        broadcastTasks();
      }
      const allPools = [];
      let queuePaused = false;
      let gate = () => "";
      const held = (pool) => queuePaused || !!gate(pool);
      function makePool(limit, { heavy = false } = {}) {
        let active = 0;
        const waiters = [];
        const pool = {
          heavy,
          acquire(id) {
            if (!held(pool) && active < limit) {
              active++;
              return Promise.resolve();
            }
            return new Promise((resolve) => waiters.push({ id, resolve }));
          },
          release() {
            active--;
            pool.drain();
          },
          /** Hands free slots to waiting jobs, unless the queue is paused. */
          drain() {
            while (!held(pool) && active < limit && waiters.length) {
              active++;
              waiters.shift().resolve();
            }
          },
          setLimit(n) {
            limit = n;
            pool.drain();
          },
          /** Moves a waiting job to the front of this pool's line. */
          prioritize(id) {
            const i = waiters.findIndex((w) => w.id === id);
            if (i <= 0) return i === 0;
            waiters.unshift(...waiters.splice(i, 1));
            return true;
          }
        };
        allPools.push(pool);
        return pool;
      }
      const broadcastQueueState = () => platform2.emit("queue:state", { paused: queuePaused });
      const convertPool = makePool(2, { heavy: true });
      const gpuPool = makePool(1, { heavy: true });
      const whisperPool = makePool(1, { heavy: true });
      const downloadPool = makePool(3);
      function applyQueueLimits() {
        const s = getSettings();
        downloadPool.setLimit(s.maxDownloads);
        convertPool.setLimit(s.maxConversions);
      }
      function setGate(fn) {
        gate = fn;
        allPools.forEach((p) => p.drain());
      }
      function setQueuePaused(paused2) {
        queuePaused = !!paused2;
        if (!queuePaused) allPools.forEach((p) => p.drain());
        broadcastQueueState();
      }
      async function runInPool(pool, id, work) {
        const queued = tasks.get(id);
        if (queued) queued.pool = pool;
        await pool.acquire(id);
        const entry = tasks.get(id);
        if (!entry || isCanceled(id)) return pool.release();
        let released = false;
        entry.releaseSlot = () => {
          if (!released) {
            released = true;
            pool.release();
          }
        };
        try {
          await work();
        } catch (err) {
          updateTask(id, { status: "error", error: `Failed to start: ${err.message}` });
        }
      }
      function killTask(entry) {
        const child = entry.child;
        if (!child) return;
        try {
          if (entry.killGroup && process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGTERM");
          else if (entry.killGroup && process.platform === "win32" && child.pid) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]).on("error", () => child.kill());
          else child.kill();
        } catch {
          child.kill();
        }
      }
      function isCanceled(id) {
        return tasks.get(id)?.state.status === "canceled";
      }
      function markHistoryChanged() {
        historyChanged = true;
      }
      function cancelTask(id) {
        const entry = tasks.get(id);
        if (!entry) return false;
        if (!["queued", "running"].includes(entry.state.status)) return false;
        killTask(entry);
        updateTask(id, { status: "canceled" });
        return true;
      }
      function rerunTask(id, opts) {
        const entry = tasks.get(id);
        const start = entry && startHandlers.get(entry.channel);
        if (!start) return null;
        let req = entry.req;
        if (opts?.anotherMatch === true && req?.matchedId) {
          const { matchedId, ...rest } = req;
          req = { ...rest, matchExclude: [...req.matchExclude ?? [], matchedId].slice(-20) };
        }
        return start(null, req);
      }
      function taskFile(id) {
        const f = tasks.get(id)?.finalPath;
        return f && fs2.existsSync(f) ? f : null;
      }
      function revealTask(id) {
        const entry = tasks.get(id);
        if (!entry) return;
        if (entry.finalPath && fs2.existsSync(entry.finalPath)) return platform2.showInFolder(entry.finalPath);
        const dest = entry.req?.destination;
        let dir = defaultDownloadDir();
        try {
          if (typeof dest === "string" && path2.isAbsolute(dest) && fs2.statSync(dest).isDirectory()) dir = dest;
        } catch {
        }
        platform2.openPath(dir);
      }
      function removeTasks(ids) {
        if (!Array.isArray(ids)) return 0;
        let removed = 0;
        for (const id of ids.slice(0, 1e3)) {
          const t = typeof id === "string" ? tasks.get(id) : null;
          if (t && TERMINAL.includes(t.state.status)) {
            tasks.delete(id);
            markHistoryChanged();
            removed++;
          }
        }
        if (removed) {
          saveHistory();
          broadcastTasks();
        }
        return removed;
      }
      function clearFinished() {
        for (const [id, t] of tasks) if (TERMINAL.includes(t.state.status)) tasks.delete(id);
        markHistoryChanged();
        saveHistory();
        broadcastTasks();
      }
      return {
        cancelTask,
        rerunTask,
        revealTask,
        taskFile,
        removeTasks,
        clearFinished,
        tasks,
        startHandlers,
        allPools,
        pools: { convertPool, gpuPool, whisperPool, downloadPool },
        logWatched,
        logPending,
        TERMINAL,
        MAX_HISTORY,
        addTask,
        appendLog,
        jobLog,
        attachLog,
        defaultDownloadDir,
        broadcastTasks,
        historyFile,
        scheduleHistorySave,
        saveHistory,
        loadHistory,
        markHistoryChanged,
        sanitizeBatch,
        wrapStart,
        updateTask,
        makePool,
        setQueuePaused,
        setGate,
        applyQueueLimits,
        runInPool,
        killTask,
        isCanceled,
        get queuePaused() {
          return queuePaused;
        }
      };
    }
    module2.exports = { createTaskEngine };
  }
});

// ../../opnduck/electron/core/common.cjs
var require_common = __commonJS({
  "../../opnduck/electron/core/common.cjs"(exports2, module2) {
    var path2 = require("node:path");
    var fs2 = require("node:fs");
    var { spawn } = require("node:child_process");
    function createCommon(ctx) {
      const {
        attachLog,
        pythonCwd,
        appendLog
      } = ctx;
      function parseHttpUrl(str) {
        try {
          const u = new URL(String(str).trim());
          return u.protocol === "http:" || u.protocol === "https:" ? u : null;
        } catch {
          return null;
        }
      }
      function decodeHtmlEntities(str) {
        return str.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
      }
      function assertAbsolutePath(p, what) {
        if (typeof p !== "string" || !path2.isAbsolute(p)) throw new Error(`${what} must be an absolute path`);
      }
      function assertOneOf(value, allowed, what) {
        if (!allowed.includes(value)) throw new Error(`Invalid ${what}: ${value}`);
      }
      function uniqueOutputPath(destDir, baseName, ext) {
        for (let n = 0; ; n++) {
          const candidate = path2.join(destDir, n === 0 ? `${baseName}.${ext}` : `${baseName} (${n}).${ext}`);
          try {
            fs2.closeSync(fs2.openSync(candidate, "wx"));
            return candidate;
          } catch (err) {
            if (err.code !== "EEXIST") throw err;
          }
        }
      }
      function probeDuration(inputPath) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", inputPath]);
          } catch {
            resolve(null);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => {
            out += c;
          });
          child.on("error", () => resolve(null));
          child.on("close", () => {
            try {
              const seconds = Number.parseFloat(JSON.parse(out).format?.duration);
              resolve(Number.isFinite(seconds) ? seconds : null);
            } catch {
              resolve(null);
            }
          });
        });
      }
      function spawnTracked(cmd, args, entry, { onStdout, onStderr, cwd } = {}) {
        return new Promise((resolve, reject) => {
          let child;
          try {
            child = spawn(cmd, args, cwd ? { cwd } : void 0);
          } catch (err) {
            reject(err);
            return;
          }
          entry.child = child;
          attachLog(child, entry.state.id);
          let tail = "";
          child.stdout?.on("data", (chunk) => {
            const text = chunk.toString();
            tail = (tail + text).slice(-2e3);
            onStdout?.(text);
          });
          child.stderr?.on("data", (chunk) => {
            const text = chunk.toString();
            tail = (tail + text).slice(-2e3);
            onStderr?.(text);
          });
          child.on("error", (err) => reject(err));
          child.on("close", (code, signal) => {
            if (signal || code !== 0) {
              reject(new Error(tail.trim().split("\n").pop() || `${cmd} exited with code ${code}`));
              return;
            }
            resolve();
          });
        });
      }
      function createModelWorker({ python, scriptPath, idleMs = 6e4, env = () => ({}) }) {
        let child = null;
        let idleTimer = null;
        function start() {
          const script = fs2.readFileSync(scriptPath, "utf8");
          const proc = spawn(python(), ["-c", script, "--serve"], {
            cwd: pythonCwd(),
            // `python -c` imports from the cwd; keep it away from user/shared folders
            env: { ...process.env, PYTHONUNBUFFERED: "1", ...env() }
          });
          child = proc;
          proc.job = null;
          let buf = "";
          let stderrTail = "";
          proc.stdout.on("data", (chunk) => {
            buf += chunk.toString();
            const lines = buf.split(/\r?\n/);
            buf = lines.pop();
            for (const line of lines) {
              const job = proc.job;
              if (!job) continue;
              if (line.startsWith("@@DONE")) job.resolve();
              else if (line.startsWith("@@FAIL")) job.reject(new Error(line.slice(6).trim() || "The job failed."));
              else job.onStdout?.(line + "\n");
            }
          });
          proc.stderr.on("data", (chunk) => {
            const text = chunk.toString();
            stderrTail = (stderrTail + text).slice(-2e3);
            proc.job?.onStderr?.(text);
          });
          proc.stdin.on("error", () => {
          });
          proc.on("error", (err) => {
            if (child === proc) child = null;
            proc.job?.reject(err);
          });
          proc.on("close", (code) => {
            if (child === proc) child = null;
            proc.job?.reject(new Error(stderrTail.trim().split("\n").pop() || `The worker exited (code ${code}).`));
          });
          return proc;
        }
        return {
          run(request, entry, { onStdout, onStderr } = {}) {
            clearTimeout(idleTimer);
            let proc;
            return new Promise((resolve, reject) => {
              try {
                proc = child && !child.killed ? child : start();
              } catch (err) {
                reject(err);
                return;
              }
              entry.child = proc;
              proc.job = {
                resolve,
                reject,
                onStdout: (t) => {
                  appendLog(entry.state.id, t, "o");
                  onStdout?.(t);
                },
                onStderr: (t) => {
                  appendLog(entry.state.id, t, "e");
                  onStderr?.(t);
                }
              };
              proc.stdin.write(JSON.stringify(request) + "\n");
            }).finally(() => {
              if (!proc) return;
              proc.job = null;
              if (child === proc) {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                  if (child === proc && !proc.job) proc.kill();
                }, idleMs);
                idleTimer.unref?.();
              }
            });
          },
          stop() {
            clearTimeout(idleTimer);
            child?.kill();
          }
        };
      }
      function probeVideoMeta(inputPath) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffprobe", [
              "-v",
              "quiet",
              "-print_format",
              "json",
              "-show_format",
              "-show_streams",
              "-select_streams",
              "v:0",
              inputPath
            ]);
          } catch {
            resolve(null);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => {
            out += c;
          });
          child.on("error", () => resolve(null));
          child.on("close", () => {
            try {
              const info = JSON.parse(out);
              const stream = info.streams?.[0];
              const duration = Number.parseFloat(info.format?.duration);
              const [num, den] = String(stream?.r_frame_rate ?? "").split("/").map(Number);
              const fps = den ? num / den : null;
              let frameCount = Number.parseInt(stream?.nb_frames, 10);
              if (!Number.isFinite(frameCount) && fps && duration) frameCount = Math.round(fps * duration);
              if (!fps || !Number.isFinite(frameCount) || frameCount <= 0) {
                resolve(null);
                return;
              }
              resolve({ fps, frameCount, fpsNum: num, fpsDen: den, width: stream.width, height: stream.height });
            } catch {
              resolve(null);
            }
          });
        });
      }
      const listSorted = (dir) => fs2.readdirSync(dir).sort();
      function probeMedia(inputPath) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", inputPath]);
          } catch {
            resolve(null);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => out += c);
          child.on("error", () => resolve(null));
          child.on("close", () => {
            try {
              const info = JSON.parse(out);
              const v = info.streams?.find((x) => x.codec_type === "video" && x.disposition?.attached_pic !== 1);
              const duration = Number.parseFloat(info.format?.duration);
              if (!Number.isFinite(duration)) return resolve(null);
              const rate = (v?.avg_frame_rate ?? "").split("/").map(Number);
              const fps = rate.length === 2 && rate[1] > 0 && rate[0] > 0 ? rate[0] / rate[1] : null;
              resolve({
                duration,
                width: v?.width ?? null,
                height: v?.height ?? null,
                hasVideo: !!v,
                hasAudio: !!info.streams?.some((x) => x.codec_type === "audio"),
                fps,
                bitrate: Number.parseInt(info.format?.bit_rate, 10) || null
              });
            } catch {
              resolve(null);
            }
          });
        });
      }
      function probeTags(inputPath) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", inputPath]);
          } catch {
            resolve(null);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => out += c);
          child.on("error", () => resolve(null));
          child.on("close", () => {
            try {
              const info = JSON.parse(out);
              const raw = {};
              for (const src of [info.format?.tags, ...(info.streams ?? []).filter((x) => x.codec_type === "audio").map((x) => x.tags)]) {
                for (const [k, v] of Object.entries(src ?? {})) raw[k.toLowerCase()] ??= v;
              }
              resolve({
                tags: raw,
                duration: Number.parseFloat(info.format?.duration) || null,
                hasCover: !!info.streams?.some((x) => x.disposition?.attached_pic === 1)
              });
            } catch {
              resolve(null);
            }
          });
        });
      }
      function mediaFrame(inputPath, t, width) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffmpeg", ["-v", "error", "-nostdin", "-ss", String(Math.max(0, t)), "-i", inputPath, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "5", "-"]);
          } catch {
            resolve(null);
            return;
          }
          const chunks = [];
          const timer = setTimeout(() => child.kill(), 15e3);
          child.stdout.on("data", (c) => chunks.push(c));
          child.on("error", () => {
            clearTimeout(timer);
            resolve(null);
          });
          child.on("close", () => {
            clearTimeout(timer);
            const buf = Buffer.concat(chunks);
            resolve(buf.length ? `data:image/jpeg;base64,${buf.toString("base64")}` : null);
          });
        });
      }
      const fmtClock = (sec) => {
        const t = Math.max(0, Math.round(sec));
        const h = Math.floor(t / 3600);
        const m = Math.floor(t % 3600 / 60);
        const r = t % 60;
        return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
      };
      function probeVideoCodec(inputPath) {
        return new Promise((resolve) => {
          let child;
          try {
            child = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", inputPath]);
          } catch {
            resolve(null);
            return;
          }
          let out = "";
          child.stdout.on("data", (c) => out += c);
          child.on("error", () => resolve(null));
          child.on("close", () => resolve(out.trim().split("\n")[0] || null));
        });
      }
      return { parseHttpUrl, decodeHtmlEntities, assertAbsolutePath, assertOneOf, uniqueOutputPath, probeDuration, spawnTracked, probeVideoMeta, probeVideoCodec, probeMedia, probeTags, mediaFrame, createModelWorker, fmtClock, listSorted };
    }
    module2.exports = { createCommon };
  }
});

// ../../opnduck/electron/core/convert.cjs
var require_convert = __commonJS({
  "../../opnduck/electron/core/convert.cjs"(exports2, module2) {
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    var os2 = require("node:os");
    var { pathToFileURL } = require("node:url");
    var { spawn } = require("node:child_process");
    function createConvert(ctx) {
      const {
        sofficeCommand,
        attachLog,
        updateTask,
        tasks,
        handleStart,
        assertAbsolutePath,
        defaultDownloadDir,
        uniqueOutputPath,
        addTask,
        broadcastTasks,
        runInPool,
        convertPool,
        probeDuration,
        isCanceled
      } = ctx;
      const SCALE_ICO = "scale='min(256,iw)':'min(256,ih)':force_original_aspect_ratio=decrease";
      const FORMATS = {
        MP4: { ext: "mp4", kind: "video", args: ["-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart"] },
        // faststart: plays while it loads and in picky phone galleries
        MKV: { ext: "mkv", kind: "video", args: ["-c:v", "libx264", "-c:a", "aac"] },
        MOV: { ext: "mov", kind: "video", args: ["-c:v", "libx264", "-c:a", "aac"] },
        WEBM: { ext: "webm", kind: "video", args: ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-c:a", "libopus"] },
        AVI: { ext: "avi", kind: "video", args: ["-c:v", "mpeg4", "-q:v", "3", "-c:a", "libmp3lame"] },
        GIF: { ext: "gif", kind: "gif", args: ["-vf", "fps=12,scale=480:-1:flags=lanczos", "-loop", "0"] },
        MP3: { ext: "mp3", kind: "audio", args: ["-c:a", "libmp3lame", "-q:a", "0"] },
        FLAC: { ext: "flac", kind: "audio", args: ["-c:a", "flac"] },
        WAV: { ext: "wav", kind: "audio", args: ["-c:a", "pcm_s16le"] },
        OGG: { ext: "ogg", kind: "audio", args: ["-c:a", "libvorbis", "-q:a", "6"] },
        M4A: { ext: "m4a", kind: "audio", args: ["-c:a", "aac", "-b:a", "256k"] },
        OPUS: { ext: "opus", kind: "audio", args: ["-c:a", "libopus", "-b:a", "160k"] },
        // Documents go through LibreOffice: `filter` is the --convert-to filter spec.
        PDF: { ext: "pdf", kind: "doc", filter: "pdf" },
        DOCX: { ext: "docx", kind: "doc", filter: "docx" },
        ODT: { ext: "odt", kind: "doc", filter: "odt" },
        RTF: { ext: "rtf", kind: "doc", filter: "rtf" },
        TXT: { ext: "txt", kind: "doc", filter: "txt:Text (encoded):UTF8" },
        HTML: { ext: "html", kind: "doc", filter: "html" },
        PNG: { ext: "png", kind: "image", args: [] },
        JPG: { ext: "jpg", kind: "image", args: ["-q:v", "2"] },
        WEBP: { ext: "webp", kind: "image", args: ["-c:v", "libwebp", "-q:v", "90"] },
        AVIF: { ext: "avif", kind: "image", args: ["-c:v", "libaom-av1", "-still-picture", "1", "-crf", "28"] },
        BMP: { ext: "bmp", kind: "image", args: [] },
        TIFF: { ext: "tiff", kind: "image", args: [] },
        ICO: { ext: "ico", kind: "image", args: ["-vf", SCALE_ICO] }
      };
      function convertArgs(req, outputPath) {
        const fmt = FORMATS[req.container];
        const tail = ["-progress", "pipe:1", "-nostats", outputPath];
        const base = ["-y", "-i", req.inputPath];
        switch (fmt.kind) {
          case "video":
            return req.mode === "remux" ? [...base, "-map", "0", "-c", "copy", ...tail] : [...base, "-map", "0:v?", "-map", "0:a?", ...fmt.args, ...tail];
          case "gif":
            return [...base, "-map", "0:v:0", ...fmt.args, ...tail];
          case "audio":
            return [...base, "-vn", "-map", "0:a:0", ...fmt.args, ...tail];
          default:
            return [...base, "-frames:v", "1", "-update", "1", ...fmt.args, ...tail];
        }
      }
      function runDocConvert(id, req, fmt, outputPath) {
        const work = fs2.mkdtempSync(path2.join(os2.tmpdir(), "opnduck-doc-"));
        const cleanup = () => fs2.rmSync(work, { recursive: true, force: true });
        const profile = pathToFileURL(path2.join(work, "profile")).href;
        let child;
        try {
          child = spawn(sofficeCommand(), [
            `-env:UserInstallation=${profile}`,
            "--headless",
            "--convert-to",
            fmt.filter,
            "--outdir",
            work,
            req.inputPath
          ], { detached: process.platform !== "win32" });
          attachLog(child, id);
        } catch (err) {
          cleanup();
          updateTask(id, { status: "error", error: `Failed to start LibreOffice: ${err.message}` });
          return id;
        }
        const entry = tasks.get(id);
        entry.child = child;
        entry.killGroup = true;
        updateTask(id, { status: "running", progress: 0.1 });
        let output = "";
        child.stdout.on("data", (c) => output = (output + c).slice(-2e3));
        child.stderr.on("data", (c) => output = (output + c).slice(-2e3));
        child.on("error", (err) => {
          cleanup();
          updateTask(id, { status: "error", error: `LibreOffice (soffice) not found on PATH (${err.message})` });
        });
        child.on("close", (code, signal) => {
          if (!tasks.has(id) || entry.state.status === "canceled" || entry.state.status === "error") return cleanup();
          const produced = path2.join(work, `${path2.basename(req.inputPath, path2.extname(req.inputPath))}.${fmt.ext}`);
          if (signal || code !== 0 || !fs2.existsSync(produced)) {
            cleanup();
            updateTask(id, {
              status: "error",
              error: output.trim().split("\n").pop() || `LibreOffice exited with code ${code}`
            });
            return;
          }
          let realSize = null;
          try {
            fs2.copyFileSync(produced, outputPath);
            realSize = fs2.statSync(outputPath).size;
          } catch (err) {
            cleanup();
            updateTask(id, { status: "error", error: `Couldn't write ${path2.basename(outputPath)}: ${err.message}` });
            return;
          }
          cleanup();
          updateTask(id, {
            status: "done",
            progress: 1,
            label: path2.basename(outputPath),
            ...realSize != null ? { sizeBytes: realSize, sizeIsEstimate: false } : {}
          });
        });
        return id;
      }
      handleStart("tasks:startConvert", async (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const fmt = Object.hasOwn(FORMATS, req.container) ? FORMATS[req.container] : null;
        if (!fmt) throw new Error(`Unsupported format: ${req.container}`);
        const ext = fmt.ext;
        if (fmt.kind !== "video") req.mode = "transcode";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, inputBase, ext);
        addTask(id, {
          state: {
            id,
            kind: "convert",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: req.container,
            quality: req.mode === "remux" ? "Remux" : "Transcode",
            sizeBytes: null,
            sizeIsEstimate: true,
            thumbnailUrl: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runConvert(id, req, fmt, outputPath).catch(
          (err) => updateTask(id, { status: "error", error: `Conversion failed to start: ${err.message}` })
        );
        return id;
      });
      async function runConvert(id, req, fmt, outputPath) {
        await runInPool(convertPool, id, () => convertJob(id, req, fmt, outputPath));
      }
      async function convertJob(id, req, fmt, outputPath) {
        if (fmt.kind === "doc") {
          runDocConvert(id, req, fmt, outputPath);
          return;
        }
        const duration = await probeDuration(req.inputPath);
        if (isCanceled(id)) return;
        let child;
        try {
          child = spawn("ffmpeg", convertArgs(req, outputPath));
          attachLog(child, id);
        } catch (err) {
          updateTask(id, { status: "error", error: `Failed to start ffmpeg: ${err.message}` });
          return;
        }
        const entry = tasks.get(id);
        entry.child = child;
        updateTask(id, { status: "running" });
        let stderrTail = "";
        let stdoutBuf = "";
        child.stdout.on("data", (chunk) => {
          stdoutBuf += chunk.toString();
          const lines = stdoutBuf.split("\n");
          stdoutBuf = lines.pop() ?? "";
          for (const line of lines) {
            const match = line.match(/^out_time_ms=(\d+)/);
            if (match && duration) {
              updateTask(id, { progress: Math.min(1, Number(match[1]) / 1e6 / duration) });
            }
          }
        });
        child.stderr.on("data", (chunk) => {
          stderrTail = (stderrTail + chunk.toString()).slice(-2e3);
        });
        child.on("error", (err) => {
          updateTask(id, { status: "error", error: `ffmpeg not found on PATH (${err.message})` });
        });
        child.on("close", (code, signal) => {
          if (!tasks.has(id)) return;
          if (entry.state.status === "canceled" || entry.state.status === "error") return;
          if (signal || code !== 0) {
            updateTask(id, {
              status: "error",
              error: stderrTail.trim().split("\n").pop() || `ffmpeg exited with code ${code}`
            });
            return;
          }
          let realSize = null;
          try {
            realSize = fs2.statSync(outputPath).size;
          } catch {
          }
          updateTask(id, {
            status: "done",
            progress: 1,
            label: path2.basename(outputPath),
            ...realSize != null ? { sizeBytes: realSize, sizeIsEstimate: false } : {}
          });
        });
        return;
      }
      return { SCALE_ICO, FORMATS, convertArgs, runDocConvert, runConvert, convertJob };
    }
    module2.exports = { createConvert };
  }
});

// ../../opnduck/electron/core/trim.cjs
var require_trim = __commonJS({
  "../../opnduck/electron/core/trim.cjs"(exports2, module2) {
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    function createTrim(ctx) {
      const {
        handleStart,
        assertAbsolutePath,
        assertOneOf,
        defaultDownloadDir,
        uniqueOutputPath,
        addTask,
        fmtClock,
        broadcastTasks,
        runInPool,
        convertPool,
        updateTask,
        tasks,
        probeMedia,
        isCanceled,
        spawnTracked
      } = ctx;
      handleStart("tasks:startTrim", async (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        assertOneOf(req.mode, ["fast", "precise"], "mode");
        if (!Number.isFinite(req.start) || req.start < 0) throw new Error("Invalid start time");
        if (req.end != null && (!Number.isFinite(req.end) || req.end <= req.start)) throw new Error("The end must be after the start");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const inExt = path2.extname(req.inputPath).replace(/^\./, "").toLowerCase();
        const keepExt = req.mode === "fast" || ["mp4", "mkv", "mov", "mp3", "flac", "wav", "m4a", "ogg", "opus"].includes(inExt);
        const ext = keepExt && inExt ? inExt : "mp4";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, `${inputBase}-trim`, ext);
        addTask(id, {
          state: {
            id,
            kind: "trim",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: req.mode === "fast" ? "Fast cut" : "Precise",
            quality: `${fmtClock(req.start)} \u2013 ${req.end == null ? "end" : fmtClock(req.end)}`,
            sizeBytes: null,
            sizeIsEstimate: false,
            thumbnailUrl: null,
            experimentalMatch: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runInPool(convertPool, id, () => trimJob(id, req, outputPath)).catch(
          (err) => updateTask(id, { status: "error", error: `Trim failed to start: ${err.message}` })
        );
        return id;
      });
      async function trimJob(id, req, outputPath) {
        const entry = tasks.get(id);
        updateTask(id, { status: "running" });
        const info = await probeMedia(req.inputPath);
        if (isCanceled(id)) return;
        if (!info) return updateTask(id, { status: "error", error: "Couldn't read this file." });
        const end = Math.min(req.end ?? info.duration, info.duration);
        const length = end - req.start;
        if (length <= 0) return updateTask(id, { status: "error", error: "The start is past the end of the file." });
        const codec = req.mode === "fast" ? ["-c", "copy", "-avoid_negative_ts", "make_zero"] : info.hasVideo ? ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] : [];
        const args = ["-y", "-ss", String(req.start), "-i", req.inputPath, "-t", String(length), ...codec, "-progress", "pipe:1", "-nostats", outputPath];
        try {
          await spawnTracked("ffmpeg", args, entry, {
            onStdout: (text) => {
              const m = [...text.matchAll(/out_time_ms=(\d+)/g)].pop();
              if (m) updateTask(id, { progress: Math.min(0.99, Number(m[1]) / 1e6 / length) });
            }
          });
        } catch (err) {
          fs2.rmSync(outputPath, { force: true });
          if (!isCanceled(id)) updateTask(id, { status: "error", error: `Trim failed: ${err.message}` });
          return;
        }
        let realSize = null;
        try {
          realSize = fs2.statSync(outputPath).size;
        } catch {
        }
        updateTask(id, { status: "done", progress: 1, label: path2.basename(outputPath), ...realSize != null ? { sizeBytes: realSize } : {} });
      }
      return { trimJob };
    }
    module2.exports = { createTrim };
  }
});

// ../../opnduck/electron/core/gpu_jobs.cjs
var require_gpu_jobs = __commonJS({
  "../../opnduck/electron/core/gpu_jobs.cjs"(exports2, module2) {
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    var { spawn } = require("node:child_process");
    var os2 = require("node:os");
    function createGpuJobs(ctx) {
      const {
        getSettings,
        spawnTracked,
        isCanceled,
        handleStart,
        assertAbsolutePath,
        assertOneOf,
        defaultDownloadDir,
        uniqueOutputPath,
        addTask,
        broadcastTasks,
        runInPool,
        gpuPool,
        attachLog,
        updateTask,
        tasks,
        probeVideoMeta,
        jobLog,
        listSorted,
        platform: platform2,
        cachedEngineCheck,
        demucsPython,
        pythonCwd,
        whisperWorker,
        demucsWorker
      } = ctx;
      const UPSCALE_MODELS = ["realesr-animevideov3", "realesrgan-x4plus", "realesrgan-x4plus-anime"];
      const GPU_THREADS = { upscale: "2:4:4", interpolate: "4:4:4", low: "1:2:2" };
      const gpuThreadArg = (kind) => getSettings().gpuThreads === "low" ? GPU_THREADS.low : GPU_THREADS[kind];
      async function spawnGpuTool(id, cmd, args, kind, entry, opts, framesDone, state = { low: false }) {
        const threads = state.low ? GPU_THREADS.low : gpuThreadArg(kind);
        try {
          return await spawnTracked(cmd, [...args, "-j", threads], entry, opts);
        } catch (err) {
          if (isCanceled(id) || threads === GPU_THREADS.low || framesDone() > 0) throw err;
          state.low = true;
          return spawnTracked(cmd, [...args, "-j", GPU_THREADS.low], entry, opts);
        }
      }
      function upscaleArgs(req, outputPath) {
        return ["-i", req.inputPath, "-o", outputPath, "-s", String(req.scale), "-n", req.model, "-v"];
      }
      handleStart("tasks:startUpscale", (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        assertOneOf(req.model, UPSCALE_MODELS, "model");
        assertOneOf(req.scale, [2, 3, 4], "scale");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const ext = path2.extname(req.inputPath).replace(/^\./, "").toLowerCase() || "png";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, `${inputBase}-${req.scale}x`, ext);
        addTask(id, {
          state: {
            id,
            kind: "upscale",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: req.model,
            quality: `${req.scale}\xD7`,
            sizeBytes: null,
            sizeIsEstimate: false,
            thumbnailUrl: null,
            experimentalMatch: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runInPool(gpuPool, id, () => {
          let child;
          try {
            child = spawn("realesrgan-ncnn-vulkan", upscaleArgs(req, outputPath));
            attachLog(child, id);
          } catch (err) {
            updateTask(id, { status: "error", error: `Failed to start realesrgan-ncnn-vulkan: ${err.message}` });
            return;
          }
          const entry = tasks.get(id);
          entry.child = child;
          updateTask(id, { status: "running" });
          let stderrTail = "";
          child.stderr.on("data", (chunk) => {
            const text = chunk.toString();
            stderrTail = (stderrTail + text).slice(-2e3);
            const match = text.match(/(\d+(?:\.\d+)?)%/);
            if (match) updateTask(id, { progress: Math.min(1, Number(match[1]) / 100) });
          });
          child.on("error", (err) => {
            updateTask(id, { status: "error", error: `realesrgan-ncnn-vulkan not found on PATH (${err.message})` });
          });
          child.on("close", (code, signal) => {
            if (!tasks.has(id)) return;
            if (entry.state.status === "canceled" || entry.state.status === "error") return;
            if (signal || code !== 0) {
              updateTask(id, {
                status: "error",
                error: stderrTail.trim().split("\n").pop() || `realesrgan-ncnn-vulkan exited with code ${code}`
              });
              return;
            }
            let realSize = null;
            try {
              realSize = fs2.statSync(outputPath).size;
            } catch {
            }
            updateTask(id, {
              status: "done",
              progress: 1,
              label: path2.basename(outputPath),
              ...realSize != null ? { sizeBytes: realSize } : {}
            });
          });
        });
        return id;
      });
      handleStart("tasks:startVideoUpscale", async (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        assertOneOf(req.model, UPSCALE_MODELS, "model");
        assertOneOf(req.scale, [2, 3, 4], "scale");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const ext = "mp4";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, `${inputBase}-${req.scale}x`, ext);
        addTask(id, {
          state: {
            id,
            kind: "upscale",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: req.model,
            quality: `${req.scale}\xD7`,
            sizeBytes: null,
            sizeIsEstimate: false,
            thumbnailUrl: null,
            experimentalMatch: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runVideoUpscale(id, req, outputPath).catch(
          (err) => updateTask(id, { status: "error", error: `Video upscale failed: ${err.message}` })
        );
        return id;
      });
      const runVideoUpscale = (id, req, outputPath) => runInPool(gpuPool, id, () => videoUpscaleJob(id, req, outputPath));
      const CHUNK_BUDGET_BYTES = 25e8;
      function framesPerChunk(meta, outFactor, isScale) {
        const forced = Number(process.env.OPNDUCK_CHUNK_FRAMES);
        if (Number.isInteger(forced) && forced >= 2) return forced;
        const px = (meta.width || 1920) * (meta.height || 1080);
        const outBytes = px * 1.5 * (isScale ? outFactor * outFactor : outFactor);
        return Math.max(24, Math.floor(CHUNK_BUDGET_BYTES / (px * 1.5 + outBytes)));
      }
      async function chunkedFrameJob(id, req, outputPath, cfg) {
        const tempDir = fs2.mkdtempSync(path2.join(os2.tmpdir(), cfg.tempPrefix));
        const segDir = path2.join(tempDir, "segments");
        const doneDir = path2.join(tempDir, "encoded");
        const framesDir = path2.join(tempDir, "frames");
        const outDir = path2.join(tempDir, "processed");
        for (const d of [segDir, doneDir, framesDir, outDir]) fs2.mkdirSync(d, { recursive: true });
        const cleanup = () => {
          try {
            fs2.rmSync(tempDir, { recursive: true, force: true });
          } catch {
          }
        };
        const fail = (message) => {
          if (!isCanceled(id)) updateTask(id, { status: "error", error: message });
          cleanup();
        };
        const emptyDir = (dir) => {
          for (const f of fs2.readdirSync(dir)) fs2.rmSync(path2.join(dir, f), { force: true });
        };
        const meta = await probeVideoMeta(req.inputPath);
        if (isCanceled(id)) return cleanup();
        if (!meta) {
          updateTask(id, { status: "error", error: "Couldn't read this video's frame rate/frame count." });
          return cleanup();
        }
        const entry = tasks.get(id);
        updateTask(id, { status: "running" });
        if (isCanceled(id)) return cleanup();
        const chunkFrames = framesPerChunk(meta, cfg.outFactor, cfg.isScale);
        const total = meta.frameCount;
        let framesDone = 0;
        const setProgress = (extra) => updateTask(id, { progress: Math.min(0.97, (framesDone + extra) / total) });
        jobLog(id, `Splitting the video into chunks of about ${chunkFrames} frames (no re-encode)\u2026`);
        try {
          await spawnTracked(
            "ffmpeg",
            [
              "-y",
              "-i",
              req.inputPath,
              "-map",
              "0:v:0",
              "-c",
              "copy",
              "-f",
              "segment",
              "-segment_time",
              String(Math.max(1, chunkFrames / meta.fps)),
              "-reset_timestamps",
              "1",
              path2.join(segDir, "seg%05d.mkv")
            ],
            entry
          );
        } catch (err) {
          return fail(`Splitting the video failed: ${err.message}`);
        }
        if (isCanceled(id)) return cleanup();
        const segments = listSorted(segDir).map((f) => path2.join(segDir, f));
        if (!segments.length) return fail("Splitting the video produced nothing.");
        const gpuState = { low: false };
        const outFps = `${meta.fpsNum * cfg.outFactorFps}/${meta.fpsDen}`;
        const encodedParts = [];
        for (let k = 0; k < segments.length; k++) {
          const hasNext = cfg.overlap && k < segments.length - 1;
          jobLog(id, `Chunk ${k + 1} of ${segments.length}: extracting frames`);
          try {
            await spawnTracked("ffmpeg", ["-y", "-i", segments[k], "-fps_mode", "passthrough", path2.join(framesDir, "%08d.png")], entry);
          } catch (err) {
            return fail(`Frame extraction failed: ${err.message}`);
          }
          if (isCanceled(id)) return cleanup();
          const framesIn = fs2.readdirSync(framesDir).length;
          if (framesIn === 0) return fail("A video segment had no frames.");
          setProgress(framesIn * 0.1);
          if (hasNext) {
            try {
              await spawnTracked(
                "ffmpeg",
                ["-y", "-i", segments[k + 1], "-fps_mode", "passthrough", "-frames:v", "1", "-start_number", String(framesIn + 1), path2.join(framesDir, "%08d.png")],
                entry
              );
            } catch (err) {
              return fail(`Frame extraction failed: ${err.message}`);
            }
            if (isCanceled(id)) return cleanup();
          }
          let doneCount = 0;
          jobLog(id, `Chunk ${k + 1} of ${segments.length}: ${cfg.failLabel.toLowerCase()} ${framesIn} frames on the GPU`);
          try {
            await spawnGpuTool(
              id,
              cfg.tool,
              cfg.gpuArgs(framesDir, outDir, framesIn, hasNext),
              cfg.threadsKind,
              entry,
              {
                onStderr: (text) => {
                  const matches = text.match(/ done\r?\n/g);
                  if (matches) {
                    doneCount += matches.length;
                    setProgress(framesIn * (0.1 + 0.8 * Math.min(1, doneCount / (framesIn * (cfg.isScale ? 1 : cfg.outFactor)))));
                  }
                }
              },
              () => doneCount,
              gpuState
            );
          } catch (err) {
            return fail(`${cfg.failLabel} failed: ${err.message}`);
          }
          if (isCanceled(id)) return cleanup();
          if (hasNext) {
            const outs = listSorted(outDir);
            fs2.rmSync(path2.join(outDir, outs[outs.length - 1]), { force: true });
          }
          jobLog(id, `Chunk ${k + 1} of ${segments.length}: encoding`);
          const part = path2.join(doneDir, `part${String(k).padStart(5, "0")}.mkv`);
          const encodeWith = (codec) => spawnTracked(
            "ffmpeg",
            ["-y", "-framerate", outFps, "-i", path2.join(outDir, "%08d.png"), ...codec === "libx264" ? ["-c:v", "libx264"] : ["-c:v", codec, "-preset", "p5", "-cq", codec === "hevc_nvenc" ? "30" : "28", "-b:v", "0"], "-pix_fmt", "yuv420p", part],
            entry
          );
          try {
            const codec = await pickVideoEncoder(Number(meta.width) * cfg.outFactorWidth);
            try {
              await encodeWith(codec);
            } catch (err) {
              if (codec === "libx264" || isCanceled(id)) throw err;
              jobLog(id, `${codec} failed (${err.message}); encoding this chunk on the CPU`);
              await encodeWith("libx264");
            }
          } catch (err) {
            return fail(`Reassembly failed: ${err.message}`);
          }
          if (isCanceled(id)) return cleanup();
          encodedParts.push(part);
          emptyDir(framesDir);
          emptyDir(outDir);
          fs2.rmSync(segments[k], { force: true });
          framesDone += framesIn;
          setProgress(0);
        }
        jobLog(id, "Joining the chunks and adding the original audio\u2026");
        const listFile = path2.join(tempDir, "parts.txt");
        fs2.writeFileSync(listFile, encodedParts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
        try {
          await spawnTracked(
            "ffmpeg",
            [
              "-y",
              "-f",
              "concat",
              "-safe",
              "0",
              "-i",
              listFile,
              "-i",
              req.inputPath,
              "-map",
              "0:v",
              "-map",
              "1:a?",
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-shortest",
              "-progress",
              "pipe:1",
              "-nostats",
              outputPath
            ],
            entry
          );
        } catch (err) {
          return fail(`Reassembly failed: ${err.message}`);
        }
        cleanup();
        let realSize = null;
        try {
          realSize = fs2.statSync(outputPath).size;
        } catch {
        }
        updateTask(id, { status: "done", progress: 1, label: path2.basename(outputPath), ...realSize != null ? { sizeBytes: realSize } : {} });
      }
      const TORCH_SCRIPT = platform2.scriptPath("torch_upscale.py");
      const TORCH_MODELS = {
        "realesr-animevideov3": {
          file: "realesr-animevideov3.pth",
          url: "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth",
          sha256: "b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d"
        },
        "realesrgan-x4plus": {
          file: "RealESRGAN_x4plus.pth",
          url: "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
          sha256: "4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1"
        },
        "realesrgan-x4plus-anime": {
          file: "RealESRGAN_x4plus_anime_6B.pth",
          url: "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
          sha256: "f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da"
        }
      };
      const sha256File = (file) => crypto.createHash("sha256").update(fs2.readFileSync(file)).digest("hex");
      async function ensureWeights(id, model) {
        const spec = TORCH_MODELS[model];
        const dir = path2.join(platform2.paths.userData, "models");
        const file = path2.join(dir, spec.file);
        try {
          if (fs2.existsSync(file) && sha256File(file) === spec.sha256) return file;
        } catch {
        }
        jobLog(id, `Downloading the ${model} model weights (one time)\u2026`);
        fs2.mkdirSync(dir, { recursive: true });
        const res = await fetch(spec.url, { signal: AbortSignal.timeout(18e4) });
        if (!res.ok || new URL(res.url).protocol !== "https:") throw new Error(`Couldn't download the model (${res.status}).`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (crypto.createHash("sha256").update(buf).digest("hex") !== spec.sha256) throw new Error("The downloaded model failed its checksum, so it was discarded.");
        const tmp = `${file}.download`;
        fs2.writeFileSync(tmp, buf);
        fs2.renameSync(tmp, file);
        return file;
      }
      function torchEngineReady() {
        if (getSettings().upscaleEngine === "ncnn") return Promise.resolve(false);
        return cachedEngineCheck("torch", demucsPython(), "import sys, torch, numpy; sys.exit(0 if torch.cuda.is_available() else 3)");
      }
      const encoderWorks = /* @__PURE__ */ new Map();
      function hwEncoderWorks(name) {
        if (!encoderWorks.has(name)) {
          encoderWorks.set(
            name,
            new Promise((resolve) => {
              let child;
              try {
                child = spawn("ffmpeg", ["-v", "error", "-nostdin", "-f", "lavfi", "-i", "nullsrc=s=256x256", "-frames:v", "1", "-c:v", name, "-f", "null", "-"]);
              } catch {
                resolve(false);
                return;
              }
              child.on("error", () => resolve(false));
              child.on("close", (code) => resolve(code === 0));
            })
          );
        }
        return encoderWorks.get(name);
      }
      async function pickVideoEncoder(outWidth) {
        if (getSettings().videoEncoder === "cpu") return "libx264";
        if (process.platform === "darwin") {
          if (outWidth <= 4096 && await hwEncoderWorks("h264_videotoolbox")) return "h264_videotoolbox";
          if (outWidth <= 8192 && await hwEncoderWorks("hevc_videotoolbox")) return "hevc_videotoolbox";
          return "libx264";
        }
        if (outWidth <= 4096 && await hwEncoderWorks("h264_nvenc")) return "h264_nvenc";
        if (outWidth <= 8192 && await hwEncoderWorks("hevc_nvenc")) return "hevc_nvenc";
        return "libx264";
      }
      async function torchUpscaleJob(id, req, outputPath) {
        const entry = tasks.get(id);
        const meta = await probeVideoMeta(req.inputPath);
        if (isCanceled(id)) return "canceled";
        if (!meta?.width || !meta.fpsNum) return "failed";
        let script, weights;
        try {
          script = fs2.readFileSync(TORCH_SCRIPT, "utf8");
          weights = await ensureWeights(id, req.model);
        } catch (err) {
          jobLog(id, `PyTorch engine unavailable: ${err.message}`);
          return "failed";
        }
        if (isCanceled(id)) return "canceled";
        demucsWorker.stop();
        whisperWorker.stop();
        updateTask(id, { status: "running" });
        const outW = meta.width * req.scale;
        let encoder = await pickVideoEncoder(outW);
        const dropOutput = () => fs2.rmSync(outputPath, { force: true });
        for (let attempt = 0; attempt < 2; attempt++) {
          jobLog(id, `PyTorch engine: ${req.model} \xD7${req.scale}, ${encoder} encoder`);
          const job = { input: req.inputPath, output: outputPath, width: meta.width, height: meta.height, fps: `${meta.fpsNum}/${meta.fpsDen}`, frames: meta.frameCount, scale: req.scale, model: req.model, weights, encoder };
          entry.killGroup = true;
          try {
            await spawnTracked(demucsPython(), ["-c", script, "--job", JSON.stringify(job)], entry, {
              cwd: pythonCwd(),
              onStdout: (text) => {
                const m = [...text.matchAll(/PROGRESS ([\d.]+)/g)].pop();
                if (m) updateTask(id, { progress: Math.min(0.99, Number(m[1])) });
              }
            });
            let realSize = null;
            try {
              realSize = fs2.statSync(outputPath).size;
            } catch {
            }
            updateTask(id, { status: "done", progress: 1, label: path2.basename(outputPath), ...realSize != null ? { sizeBytes: realSize } : {} });
            return "done";
          } catch (err) {
            dropOutput();
            if (isCanceled(id)) return "canceled";
            jobLog(id, `PyTorch engine failed: ${err.message}`);
            if (encoder !== "libx264" && attempt === 0) {
              encoder = "libx264";
              continue;
            }
            return "failed";
          }
        }
        return "failed";
      }
      const ncnnVideoUpscaleJob = (id, req, outputPath) => chunkedFrameJob(id, req, outputPath, {
        tempPrefix: "opnduck-upscale-",
        tool: "realesrgan-ncnn-vulkan",
        threadsKind: "upscale",
        failLabel: "Upscaling",
        outFactor: req.scale,
        outFactorFps: 1,
        outFactorWidth: req.scale,
        // output width = source width x this (picks the encoder)
        isScale: true,
        overlap: false,
        gpuArgs: (inDir, outDir) => ["-i", inDir, "-o", outDir, "-s", String(req.scale), "-n", req.model, "-v"]
      });
      const videoUpscaleJob = async (id, req, outputPath) => {
        if (await torchEngineReady()) {
          const result = await torchUpscaleJob(id, req, outputPath);
          if (result !== "failed") return;
          jobLog(id, "Falling back to the ncnn engine\u2026");
        }
        return ncnnVideoUpscaleJob(id, req, outputPath);
      };
      const interpolateJob = (id, req, outputPath) => chunkedFrameJob(id, req, outputPath, {
        tempPrefix: "opnduck-interpolate-",
        tool: "rife-ncnn-vulkan",
        threadsKind: "interpolate",
        failLabel: "Interpolation",
        outFactor: req.multiplier,
        outFactorFps: req.multiplier,
        outFactorWidth: 1,
        isScale: false,
        overlap: true,
        // rife-v4.6: the tool's default model (rife-HD) can't make a custom frame count (-n), v4 models can.
        // With the next segment's first frame appended the output spans framesIn+1 inputs, so N*mult+1 frames
        // keep the spacing at 1/mult (the extra last one is dropped); the final segment has no neighbour.
        gpuArgs: (inDir, outDir, framesIn, hasNext) => [
          "-i",
          inDir,
          "-o",
          outDir,
          "-n",
          String(framesIn * req.multiplier + (hasNext ? 1 : 0)),
          "-m",
          "rife-v4.6",
          "-v"
        ]
      });
      handleStart("tasks:startInterpolate", async (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        assertOneOf(req.multiplier, [2, 4], "multiplier");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const ext = "mp4";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, `${inputBase}-${req.multiplier}x-frames`, ext);
        addTask(id, {
          state: {
            id,
            kind: "interpolate",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: "RIFE",
            quality: `${req.multiplier}\xD7 frames`,
            sizeBytes: null,
            sizeIsEstimate: false,
            thumbnailUrl: null,
            experimentalMatch: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runInterpolate(id, req, outputPath).catch(
          (err) => updateTask(id, { status: "error", error: `Interpolation failed: ${err.message}` })
        );
        return id;
      });
      const runInterpolate = (id, req, outputPath) => runInPool(gpuPool, id, () => interpolateJob(id, req, outputPath));
      return { UPSCALE_MODELS, GPU_THREADS, gpuThreadArg, spawnGpuTool, upscaleArgs, runVideoUpscale, CHUNK_BUDGET_BYTES, framesPerChunk, chunkedFrameJob, TORCH_SCRIPT, TORCH_MODELS, sha256File, ensureWeights, torchEngineReady, encoderWorks, hwEncoderWorks, pickVideoEncoder, torchUpscaleJob, ncnnVideoUpscaleJob, videoUpscaleJob, interpolateJob, runInterpolate };
    }
    module2.exports = { createGpuJobs };
  }
});

// ../../opnduck/electron/core/compress.cjs
var require_compress = __commonJS({
  "../../opnduck/electron/core/compress.cjs"(exports2, module2) {
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    var OVERHEAD = 0.97;
    var MIN_VIDEO_KBPS = 80;
    var MIN_BPP = 0.05;
    var NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";
    function planBitrates({ durationSec, targetBytes, hasAudio, hasVideo = true }) {
      if (!(durationSec > 0) || !(targetBytes > 0)) return { error: "Invalid duration or target.", minBytes: 0 };
      const totalKbps = targetBytes * 8 * OVERHEAD / durationSec / 1e3;
      if (!hasVideo) {
        const audioKbps2 = Math.min(320, Math.floor(totalKbps));
        if (audioKbps2 < 24) return { error: "That target is too small for this audio length.", minBytes: Math.ceil(24 * 1e3 * durationSec / 8 / OVERHEAD) };
        return { videoKbps: 0, audioKbps: audioKbps2, totalKbps };
      }
      let audioKbps = 0;
      if (hasAudio) audioKbps = totalKbps - 96 < 500 ? 64 : 96;
      const videoKbps = Math.floor(totalKbps - audioKbps);
      if (videoKbps < MIN_VIDEO_KBPS) {
        const need = MIN_VIDEO_KBPS + (hasAudio ? 64 : 0);
        return { error: "That target is too small for this video length.", minBytes: Math.ceil(need * 1e3 * durationSec / 8 / OVERHEAD) };
      }
      return { videoKbps, audioKbps, totalKbps };
    }
    var even = (n) => Math.max(2, Math.round(n / 2) * 2);
    function pickResolution({ width, height, fps, videoKbps }) {
      const srcFps = fps > 0 ? fps : 30;
      const steps = [...new Set([height, 1080, 720, 480, 360].filter((h) => h <= height))].sort((a, b) => b - a);
      const at = (h, f) => {
        const w = h === height ? width : even(h * width / height);
        return { width: even(w), height: even(h), fps: f, bpp: videoKbps * 1e3 / (even(w) * even(h) * f) };
      };
      let pick = null;
      for (const f of srcFps > 30 ? [srcFps, 30] : [srcFps]) {
        for (const h of steps) {
          const c = at(h, f);
          if (c.bpp >= MIN_BPP) {
            pick = c;
            break;
          }
        }
        if (pick) break;
      }
      pick ??= at(steps[steps.length - 1], Math.min(srcFps, 30));
      const scaled = pick.height !== height;
      const fpsCapped = pick.fps < srcFps - 0.5;
      return { width: pick.width, height: pick.height, fps: pick.fps, scaled, fpsCapped, label: `${pick.height}p${fpsCapped ? ` \xB7 ${Math.round(pick.fps)} fps` : ""}` };
    }
    function videoCommon(plan, res) {
      const filters = [];
      if (res.scaled) filters.push(`scale=${res.width}:${res.height}:flags=lanczos`);
      if (res.fpsCapped) filters.push(`fps=${Math.round(res.fps)}`);
      return [...filters.length ? ["-vf", filters.join(",")] : [], "-pix_fmt", "yuv420p"];
    }
    var audioArgs = (plan) => plan.audioKbps ? ["-map", "0:a:0?", "-c:a", "aac", "-b:a", `${plan.audioKbps}k`] : ["-an"];
    function x264Args({ input, output, plan, res, pass, passlog, scale = 1 }) {
      const rate = ["-c:v", "libx264", "-preset", "medium", "-b:v", `${Math.floor(plan.videoKbps * scale)}k`, "-pass", String(pass), "-passlogfile", passlog];
      const tail = ["-progress", "pipe:1", "-nostats"];
      if (pass === 1) return ["-y", "-i", input, "-map", "0:v:0", ...videoCommon(plan, res), ...rate, "-an", ...tail, "-f", "null", NULL_DEVICE];
      return ["-y", "-i", input, "-map", "0:v:0", ...videoCommon(plan, res), ...rate, ...audioArgs(plan), "-movflags", "+faststart", ...tail, output];
    }
    function nvencArgs({ input, output, plan, res, scale = 1 }) {
      const v = Math.floor(plan.videoKbps * scale);
      const rate = ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-b:v", `${v}k`, "-maxrate", `${Math.floor(v * 1.25)}k`, "-bufsize", `${v * 2}k`, "-multipass", "fullres"];
      return ["-y", "-i", input, "-map", "0:v:0", ...videoCommon(plan, res), ...rate, ...audioArgs(plan), "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", output];
    }
    function audioOnlyArgs({ input, output, plan, scale = 1 }) {
      return ["-y", "-i", input, "-vn", "-c:a", "libmp3lame", "-b:a", `${Math.max(24, Math.floor(plan.audioKbps * scale))}k`, "-progress", "pipe:1", "-nostats", output];
    }
    var formatMB = (mb) => String(Math.round(mb * 100) / 100);
    function createCompress(ctx) {
      const {
        handleStart,
        assertAbsolutePath,
        assertOneOf,
        defaultDownloadDir,
        uniqueOutputPath,
        addTask,
        broadcastTasks,
        runInPool,
        convertPool,
        updateTask,
        tasks,
        probeMedia,
        isCanceled,
        spawnTracked,
        getSettings,
        hwEncoderWorks
      } = ctx;
      handleStart("tasks:startCompress", async (_e, req) => {
        assertAbsolutePath(req.inputPath, "inputPath");
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        assertOneOf(req.quality, ["fast", "best"], "quality");
        if (!Number.isFinite(req.targetMB) || req.targetMB < 0.5 || req.targetMB > 1e5) throw new Error("The target size must be between 0.5 and 100000 MB");
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        const info = await probeMedia(req.inputPath);
        if (!info) throw new Error("Couldn't read this file.");
        const targetBytes = Math.floor(req.targetMB * 1024 * 1024);
        const plan = planBitrates({ durationSec: info.duration, targetBytes, hasAudio: info.hasAudio !== false, hasVideo: info.hasVideo });
        if (plan.error) throw new Error(`${plan.error} The smallest this can reach is about ${formatMB(plan.minBytes / 1024 / 1024)} MB.`);
        const inSize = fs2.statSync(req.inputPath).size;
        if (inSize <= targetBytes) throw new Error(`This file is already ${formatMB(inSize / 1024 / 1024)} MB, under the ${formatMB(req.targetMB)} MB target.`);
        const res = info.hasVideo ? pickResolution({ width: info.width, height: info.height, fps: info.fps, videoKbps: plan.videoKbps }) : null;
        const ext = info.hasVideo ? "mp4" : "mp3";
        const inputBase = path2.basename(req.inputPath, path2.extname(req.inputPath));
        const outputPath = uniqueOutputPath(destDir, `${inputBase}-${formatMB(req.targetMB)}MB`, ext);
        addTask(id, {
          state: {
            id,
            kind: "compress",
            status: "queued",
            progress: 0,
            label: path2.basename(req.inputPath),
            format: `Under ${formatMB(req.targetMB)} MB`,
            quality: res ? res.label : `${plan.audioKbps} kb/s`,
            sizeBytes: null,
            sizeIsEstimate: false,
            thumbnailUrl: null,
            experimentalMatch: null
          },
          child: null,
          finalPath: outputPath
        });
        broadcastTasks();
        runInPool(convertPool, id, () => compressJob(id, req, { info, plan, res, targetBytes, outputPath })).catch(
          (err) => updateTask(id, { status: "error", error: `Compress failed to start: ${err.message}` })
        );
        return id;
      });
      async function compressJob(id, req, { info, plan, res, targetBytes, outputPath }) {
        const entry = tasks.get(id);
        updateTask(id, { status: "running" });
        const passlogDir = fs2.mkdtempSync(path2.join(os2.tmpdir(), "opnduck-compress-"));
        const passlog = path2.join(passlogDir, "pass");
        const input = req.inputPath;
        const run = (args, from, to) => spawnTracked("ffmpeg", args, entry, {
          onStdout: (text) => {
            const m = [...text.matchAll(/out_time_ms=(\d+)/g)].pop();
            if (m) updateTask(id, { progress: Math.min(0.99, from + (to - from) * Math.min(1, Number(m[1]) / 1e6 / info.duration)) });
          }
        });
        const sizeNow = () => fs2.statSync(outputPath).size;
        try {
          if (!info.hasVideo) {
            await run(audioOnlyArgs({ input, output: outputPath, plan }), 0, 1);
            if (sizeNow() > targetBytes) await run(audioOnlyArgs({ input, output: outputPath, plan, scale: 0.92 }), 0, 1);
          } else {
            const useNvenc = req.quality === "fast" && getSettings().videoEncoder !== "cpu" && await hwEncoderWorks("h264_nvenc");
            let done = false;
            if (useNvenc) {
              try {
                await run(nvencArgs({ input, output: outputPath, plan, res }), 0, 1);
                if (sizeNow() > targetBytes) await run(nvencArgs({ input, output: outputPath, plan, res, scale: 0.92 }), 0, 1);
                done = true;
              } catch (err) {
                if (isCanceled(id)) throw err;
                updateTask(id, { progress: 0 });
              }
            }
            if (!done) {
              await run(x264Args({ input, output: outputPath, plan, res, pass: 1, passlog }), 0, 0.4);
              await run(x264Args({ input, output: outputPath, plan, res, pass: 2, passlog }), 0.4, 1);
              if (sizeNow() > targetBytes) await run(x264Args({ input, output: outputPath, plan, res, pass: 2, passlog, scale: 0.92 }), 0.4, 1);
            }
          }
        } catch (err) {
          fs2.rmSync(outputPath, { force: true });
          if (!isCanceled(id)) updateTask(id, { status: "error", error: `Compress failed: ${err.message}` });
          return;
        } finally {
          fs2.rmSync(passlogDir, { recursive: true, force: true });
        }
        let realSize = null;
        try {
          realSize = sizeNow();
        } catch {
        }
        updateTask(id, { status: "done", progress: 1, label: path2.basename(outputPath), ...realSize != null ? { sizeBytes: realSize } : {} });
      }
      return { compressJob };
    }
    module2.exports = { createCompress, planBitrates, pickResolution, x264Args, nvencArgs, audioOnlyArgs, MIN_BPP };
  }
});

// ../../opnduck/electron/core/download.cjs
var require_download = __commonJS({
  "../../opnduck/electron/core/download.cjs"(exports2, module2) {
    var { stripLinkLogin } = require_redact();
    var { spawn } = require("node:child_process");
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    function protectUrlCredentials(rawUrl) {
      const none = { url: rawUrl, tail: ["--", rawUrl], args: [], cleanup() {
      } };
      let u;
      try {
        u = new URL(rawUrl);
      } catch {
        return none;
      }
      if (!u.username && !u.password) return none;
      const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), "opnduck-auth-"));
      fs2.chmodSync(dir, 448);
      const file = path2.join(dir, "auth.conf");
      const quoted = `"${u.toString().replace(/[\\"]/g, "\\$&")}"`;
      fs2.writeFileSync(file, quoted + "\n", { mode: 384 });
      u.username = "";
      u.password = "";
      return {
        url: u.toString(),
        tail: [],
        args: ["--config-locations", file],
        cleanup() {
          fs2.rmSync(dir, { recursive: true, force: true });
        }
      };
    }
    var LOGIN_PAGE_MSG = "A link with a login only works for a direct file link, not a web page. Open the file itself (\u2026/video.mp4) or use a link without the login.";
    var LOGIN_CHECK_MSG = "Couldn't check that this link with a login is a direct file (the server refused it, did not answer, or did not say it is a video/audio file). Check the login and the link, or use a link without the login.";
    var DIRECT_FILE_TYPE = /^(video|audio)\/|^application\/(octet-stream|ogg|mp4|x-matroska)(;|$)/;
    async function loginLinkProblem(rawUrl) {
      let u;
      try {
        u = new URL(rawUrl);
      } catch {
        return null;
      }
      if (!u.username && !u.password) return null;
      const auth = "Basic " + Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64");
      const origin = u.origin;
      u.username = "";
      u.password = "";
      let next = u.toString();
      try {
        for (let hop = 0; hop < 6; hop++) {
          const target = new URL(next);
          const headers = target.origin === origin ? { authorization: auth } : {};
          const res = await fetch(target, { method: "GET", headers: { ...headers, range: "bytes=0-0" }, redirect: "manual", signal: AbortSignal.timeout(1e4) });
          const loc = res.headers.get("location");
          const type = (res.headers.get("content-type") || "").toLowerCase();
          res.body?.cancel().catch(() => {
          });
          if (res.status >= 300 && res.status < 400 && loc) {
            next = new URL(loc, target).toString();
            continue;
          }
          if (res.status >= 400) return LOGIN_CHECK_MSG;
          if (DIRECT_FILE_TYPE.test(type)) return null;
          return type ? LOGIN_PAGE_MSG : LOGIN_CHECK_MSG;
        }
      } catch {
        return LOGIN_CHECK_MSG;
      }
      return LOGIN_CHECK_MSG;
    }
    function redactUrl(rawUrl) {
      try {
        const u = new URL(rawUrl);
        if (!u.username && !u.password) return rawUrl;
        u.username = "";
        u.password = "";
        return u.toString();
      } catch {
        return rawUrl;
      }
    }
    function createDownload(ctx) {
      const {
        parseHttpUrl,
        decodeHtmlEntities,
        ytdlpCommand,
        ytdlpBaseArgs,
        hasCookies,
        handleStart,
        assertAbsolutePath,
        defaultDownloadDir,
        addTask,
        broadcastTasks,
        updateTask,
        isCanceled,
        startHandlers,
        tasks,
        downloadPool,
        attachLog
      } = ctx;
      const SPOTIFY_TRACK_RE = /open\.spotify\.com\/(?:intl-\w+\/)?track\/[a-zA-Z0-9]+/;
      const SPOTIFY_OTHER_RE = /open\.spotify\.com\/(?:intl-\w+\/)?(album|playlist|artist|show|episode)\//;
      async function resolveSpotifyTrack(url) {
        const other = url.match(SPOTIFY_OTHER_RE);
        if (other) {
          return {
            error: `Spotify ${other[1]} links aren't supported yet \u2014 only single tracks (experimental YouTube match).`
          };
        }
        if (!SPOTIFY_TRACK_RE.test(url)) return null;
        const parsed = parseHttpUrl(url);
        if (!parsed || parsed.hostname !== "open.spotify.com") return null;
        let html;
        try {
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8e3) });
          if (new URL(res.url).hostname !== "open.spotify.com") return { error: "Spotify redirected somewhere unexpected \u2014 can't read this track." };
          html = await res.text();
        } catch (err) {
          return { error: `Couldn't reach Spotify to identify the track: ${err.message}` };
        }
        const rawTitle = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
        const rawDesc = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1];
        const title = rawTitle && decodeHtmlEntities(rawTitle);
        const desc = rawDesc && decodeHtmlEntities(rawDesc);
        const artist = desc?.split(" \xB7 ")[0];
        if (!title || !artist) {
          return { error: "Couldn't read this track's info from Spotify \u2014 the page format may have changed." };
        }
        return { query: `ytsearch1:${artist} - ${title}`, search: `${artist} - ${title}`, label: `${artist} - ${title}`, artist, title };
      }
      const AUDIO_EXT = { MP3: "mp3", FLAC: "flac", WAV: "wav" };
      const VIDEO_EXT = { MP4: "mp4", MKV: "mkv", MOV: "mov" };
      function qualityLabel(req) {
        if (req.audioLang) return `Audio \xB7 ${req.audioLang}`;
        if (req.format in AUDIO_EXT) {
          if (req.format !== "MP3") return "Lossless";
          return !req.audioQuality || req.audioQuality === "best" ? "Best" : req.audioQuality;
        }
        return !req.videoQuality || req.videoQuality === "best" ? "Best" : `${req.videoQuality}p`;
      }
      function subtitleArgs(req) {
        const subs = req.subs;
        if (!subs || subs.mode === "off" || subs.langs.length === 0) return [];
        const args = ["--sub-langs", subs.langs.join(","), "--convert-subs", "srt"];
        if (subs.mode === "manual" || subs.mode === "both") args.push("--write-subs");
        if (subs.mode === "auto" || subs.mode === "both") args.push("--write-auto-subs");
        if (subs.embed && !subs.only && Object.hasOwn(VIDEO_EXT, req.format)) args.push("--embed-subs");
        if (subs.only) args.push("--skip-download");
        return args;
      }
      function embedArgs(req) {
        if (!req.embedMeta) return [];
        const args = ["--embed-metadata"];
        if (req.format === "MP3" || req.format === "MP4" || req.format === "MKV") {
          args.push("--embed-thumbnail", "--convert-thumbnails", "jpg");
        }
        return args;
      }
      function formatArgs(req) {
        const subs = subtitleArgs(req);
        if (req.subs?.only && subs.length) return subs;
        if (Object.hasOwn(AUDIO_EXT, req.format)) {
          const args = ["-x", "--audio-format", AUDIO_EXT[req.format]];
          if (req.audioLang) args.push("-f", `ba[language^=${req.audioLang}]/ba`);
          if (req.format === "MP3") {
            args.push("--audio-quality", req.audioQuality && req.audioQuality !== "best" ? req.audioQuality : "0");
          }
          return [...args, ...embedArgs(req), ...subs];
        }
        if (Object.hasOwn(VIDEO_EXT, req.format)) {
          const height = req.videoQuality && req.videoQuality !== "best" ? Number(req.videoQuality) : null;
          const selector = height ? `bv*[height<=${height}]+ba/b[height<=${height}]` : "bv*+ba/b";
          return ["-f", selector, "--merge-output-format", VIDEO_EXT[req.format], ...embedArgs(req), ...subs];
        }
        throw new Error(`Unsupported format: ${req.format}`);
      }
      const YT_HOST_RE = /(^|\.)youtube\.com$|^youtu\.be$/;
      const CHANNEL_PATH_RE = /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)(\/(videos|shorts|streams|live|playlists))?\/?$/;
      function classifyLink(rawUrl) {
        const none = { kind: null, type: null, url: rawUrl, query: null, needsLogin: false };
        let u;
        try {
          u = new URL(rawUrl);
        } catch {
          return none;
        }
        if (!YT_HOST_RE.test(u.hostname)) return none;
        const list = u.searchParams.get("list");
        const loginList = list === "WL" || list === "LL" || list === "LM";
        if (u.pathname === "/results" && u.searchParams.get("search_query")) {
          return { kind: "only", type: "search", url: rawUrl, query: u.searchParams.get("search_query"), needsLogin: false };
        }
        if (CHANNEL_PATH_RE.test(u.pathname)) {
          const hasTab = /\/(videos|shorts|streams|live|playlists)\/?$/.test(u.pathname);
          const url = hasTab ? rawUrl : `${u.origin}${u.pathname.replace(/\/$/, "")}/videos`;
          return { kind: "only", type: "channel", url, query: null, needsLogin: false };
        }
        if (list && !list.startsWith("RD")) {
          if (u.pathname === "/playlist") {
            const type = list === "WL" ? "watchlater" : loginList ? "liked" : "playlist";
            return { kind: "only", type, url: rawUrl, query: null, needsLogin: loginList };
          }
          if (u.searchParams.get("v") || u.hostname === "youtu.be") {
            return { kind: "mixed", type: "playlist", url: rawUrl, query: null, needsLogin: loginList };
          }
        }
        return none;
      }
      function listUrl(link, limit) {
        if (link.type === "search") return `ytsearch${Math.min(limit || 20, 100)}:${link.query}`;
        return link.url;
      }
      function probePlaylist(url) {
        return new Promise((resolve) => {
          let child;
          const auth = protectUrlCredentials(url);
          try {
            child = spawn(ytdlpCommand(), [...ytdlpBaseArgs(), ...auth.args, "--flat-playlist", "--dump-single-json", "--no-warnings", "--playlist-end", "5000", ...auth.tail]);
          } catch {
            auth.cleanup();
            resolve(null);
            return;
          }
          child.on("close", auth.cleanup);
          child.on("error", auth.cleanup);
          let out = "";
          const timer = setTimeout(() => child.kill(), 45e3);
          child.stdout.on("data", (c) => {
            out += c;
          });
          child.on("error", () => {
            clearTimeout(timer);
            resolve(null);
          });
          child.on("close", () => {
            clearTimeout(timer);
            try {
              const info = JSON.parse(out);
              const entries = Array.isArray(info.entries) ? info.entries : [];
              const first = entries.find((e) => e?.thumbnails?.length);
              resolve({
                title: info.title ?? "Playlist",
                count: entries.length,
                thumbnailUrl: pickSmallThumbnail(first?.thumbnails, first?.thumbnails?.[first.thumbnails.length - 1]?.url ?? null)
              });
            } catch {
              resolve(null);
            }
          });
        });
      }
      async function probeInfo(req) {
        const empty = { approxSizeBytes: null, thumbnailUrl: null, playlist: null };
        if (!parseHttpUrl(req.url)) return { title: "Only http(s) links are supported", ...empty };
        const spotify = await resolveSpotifyTrack(req.url);
        if (spotify?.error) return { title: spotify.error, ...empty };
        const effectiveUrl = spotify?.query ?? req.url;
        const loginProblem = await loginLinkProblem(effectiveUrl);
        if (loginProblem) return { title: loginProblem, ...empty };
        const link = spotify ? classifyLink("") : classifyLink(req.url);
        const kind = link.kind;
        const loginMissing = link.needsLogin && !hasCookies();
        const playlistPromise = kind ? probePlaylist(listUrl(link, req.limit)) : Promise.resolve(null);
        const playlist = kind === "only" ? await playlistPromise : null;
        const playlistInfo = playlist ? { title: playlist.title, count: playlist.count, ambiguous: false, type: link.type, needsLogin: loginMissing } : null;
        if (kind === "only") {
          if (playlist) return { title: playlist.title, approxSizeBytes: null, thumbnailUrl: playlist.thumbnailUrl, playlist: playlistInfo };
          return {
            title: loginMissing ? "This list needs you to be signed in" : "Couldn't read this list",
            approxSizeBytes: null,
            thumbnailUrl: null,
            playlist: { title: loginMissing ? "Sign-in required" : "Unavailable", count: 0, ambiguous: false, type: link.type, needsLogin: loginMissing }
          };
        }
        const single = await new Promise((resolve) => {
          const fallback = { title: redactUrl(req.url), approxSizeBytes: null, thumbnailUrl: null };
          let child;
          const auth = protectUrlCredentials(effectiveUrl);
          try {
            child = spawn(ytdlpCommand(), [...ytdlpBaseArgs(), ...auth.args, "--dump-json", "--no-warnings", "--no-playlist", ...auth.tail]);
          } catch {
            auth.cleanup();
            resolve(fallback);
            return;
          }
          child.on("close", auth.cleanup);
          child.on("error", auth.cleanup);
          let out = "";
          const timer = setTimeout(() => child.kill(), 6e4);
          child.stdout.on("data", (c) => {
            out += c;
          });
          child.on("error", () => {
            clearTimeout(timer);
            resolve(fallback);
          });
          child.on("close", () => {
            clearTimeout(timer);
            try {
              const info = JSON.parse(out.trim().split("\n")[0]);
              resolve({
                title: spotify ? `${spotify.label} (YouTube match)` : info.title ?? redactUrl(req.url),
                approxSizeBytes: estimateSize(info, req),
                thumbnailUrl: pickSmallThumbnail(info.thumbnails, info.thumbnail ?? null),
                ...extraInfo(info)
              });
            } catch {
              resolve(fallback);
            }
          });
        });
        const mixedPlaylist = kind === "mixed" ? await playlistPromise : null;
        return {
          ...single,
          playlist: mixedPlaylist ? { title: mixedPlaylist.title, count: mixedPlaylist.count, ambiguous: true, type: link.type, needsLogin: loginMissing } : null
        };
      }
      function extraInfo(info) {
        const subtitleLangs = Object.keys(info.subtitles || {}).filter((k) => k !== "live_chat");
        const COMMON = ["en", "sv", "es", "de", "fr", "pt", "it", "nl", "ru", "ja", "ko", "zh-Hans", "ar", "tr", "pl"];
        const autoLangs = Object.keys(info.automatic_captions || {}).filter((k) => k.endsWith("-orig") || COMMON.includes(k));
        const audioLangs = [
          ...new Set(
            (info.formats || []).filter((f) => f.vcodec === "none" && f.acodec && f.acodec !== "none" && f.language).map((f) => String(f.language))
          )
        ];
        const flags = [];
        if (info.projection && info.projection !== "rectangular") flags.push("360");
        if (info.stereo_mode || (info.formats || []).some((f) => /3d/i.test(String(f.format_note || "")))) flags.push("3d");
        return { subtitleLangs, autoLangs, audioLangs, flags };
      }
      const LANG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
      function validateDownloadRequest(req) {
        req.url = String(req.url ?? "").trim();
        if (!Object.hasOwn(AUDIO_EXT, req.format) && !Object.hasOwn(VIDEO_EXT, req.format)) {
          throw new Error(`Unsupported format: ${req.format}`);
        }
        if (req.videoQuality != null && req.videoQuality !== "best" && !/^\d{3,4}$/.test(String(req.videoQuality))) {
          throw new Error(`Invalid video quality: ${req.videoQuality}`);
        }
        if (req.limit != null && !(Number.isInteger(req.limit) && req.limit >= 1 && req.limit <= 5e3)) {
          throw new Error(`Invalid list limit: ${req.limit}`);
        }
        if (req.subs != null) {
          const subs = req.subs;
          if (!["off", "manual", "auto", "both"].includes(subs.mode)) throw new Error(`Invalid subtitle mode: ${subs.mode}`);
          if (!Array.isArray(subs.langs) || subs.langs.length > 20 || !subs.langs.every((l) => typeof l === "string" && LANG_RE.test(l))) {
            throw new Error("Invalid subtitle languages");
          }
        }
        if (req.audioTracks != null) {
          if (!Array.isArray(req.audioTracks) || req.audioTracks.length > 10 || !req.audioTracks.every((l) => typeof l === "string" && LANG_RE.test(l))) {
            throw new Error("Invalid audio track languages");
          }
        }
        if (req.audioLang != null && !LANG_RE.test(String(req.audioLang))) throw new Error("Invalid audio language");
        if (req.embedMeta != null && typeof req.embedMeta !== "boolean") throw new Error("Invalid embed option");
        const VIDEO_ID_RE = /^[\w-]{6,20}$/;
        if (req.matchExclude != null && (!Array.isArray(req.matchExclude) || req.matchExclude.length > 20 || !req.matchExclude.every((x) => typeof x === "string" && VIDEO_ID_RE.test(x)))) {
          throw new Error("Invalid match exclusion list");
        }
        if (req.matchedId != null && !VIDEO_ID_RE.test(String(req.matchedId))) throw new Error("Invalid matched video id");
      }
      function formatSize(f) {
        return f?.filesize ?? f?.filesize_approx ?? null;
      }
      function bestAudioFormat(formats) {
        const audios = formats.filter((f) => f.vcodec === "none" && f.acodec && f.acodec !== "none");
        return audios.reduce((best, f) => (f.tbr || 0) > (best?.tbr || 0) ? f : best, null);
      }
      function bestVideoFormat(formats, maxHeight) {
        const videos = formats.filter((f) => f.vcodec && f.vcodec !== "none" && f.height);
        const pool = maxHeight ? videos.filter((f) => f.height <= maxHeight) : videos;
        const candidates = pool.length ? pool : videos;
        return candidates.reduce((best, f) => (f.height || 0) > (best?.height || 0) ? f : best, null);
      }
      function estimateSize(info, req) {
        const formats = info.formats || [];
        const duration = info.duration;
        if (req.format in AUDIO_EXT) {
          if (req.format === "FLAC" && duration) return Math.round(1e3 * 1e3 / 8 * duration);
          if (req.format === "WAV" && duration) return Math.round(1411 * 1e3 / 8 * duration);
          if (req.audioQuality && req.audioQuality !== "best" && duration) {
            const kbps = Number(req.audioQuality.replace(/k$/i, ""));
            return Math.round(kbps * 1e3 / 8 * duration);
          }
          return formatSize(bestAudioFormat(formats));
        }
        const maxHeight = req.videoQuality && req.videoQuality !== "best" ? Number(req.videoQuality) : null;
        const video = bestVideoFormat(formats, maxHeight);
        const audio = bestAudioFormat(formats);
        const vSize = formatSize(video);
        const aSize = formatSize(audio);
        return vSize == null && aSize == null ? null : (vSize ?? 0) + (aSize ?? 0);
      }
      handleStart("tasks:start", async (_e, req) => {
        validateDownloadRequest(req);
        if (req.destination != null) assertAbsolutePath(req.destination, "destination");
        if (req.audioQuality != null) {
          if (typeof req.audioQuality !== "string" || !/^(best|\d{1,3}k?)$/i.test(req.audioQuality)) {
            throw new Error(`Invalid audio quality: ${req.audioQuality}`);
          }
        }
        const id = crypto.randomUUID();
        const destDir = req.destination || defaultDownloadDir();
        fs2.mkdirSync(destDir, { recursive: true });
        if (req.audioTracks?.length && !req.audioLang && (!req.batch || String(req.batch.id).startsWith("tracks-"))) {
          req.batch = { id: `tracks-${id}`, label: "Download + audio tracks", size: 1 + req.audioTracks.length };
        }
        addTask(id, {
          state: {
            id,
            kind: "download",
            status: "queued",
            progress: 0,
            label: redactUrl(req.url),
            format: req.format,
            quality: qualityLabel(req),
            sizeBytes: Number.isFinite(req.approxSizeBytes) && req.approxSizeBytes >= 0 ? req.approxSizeBytes : null,
            sizeIsEstimate: true,
            thumbnailUrl: typeof req.thumbnailUrl === "string" && parseHttpUrl(req.thumbnailUrl) ? req.thumbnailUrl : null,
            experimentalMatch: null
          },
          child: null,
          finalPath: null
        });
        broadcastTasks();
        if (!parseHttpUrl(req.url)) {
          updateTask(id, { status: "error", error: "Only http(s) links are supported." });
          return id;
        }
        const spotify = await resolveSpotifyTrack(req.url);
        if (spotify?.error) {
          updateTask(id, { status: "error", error: spotify.error });
          return id;
        }
        if (isCanceled(id)) return id;
        const loginProblem = await loginLinkProblem(spotify?.query ?? req.url);
        if (loginProblem) {
          updateTask(id, { status: "error", error: loginProblem });
          return id;
        }
        if (spotify) {
          const exclude = req.matchExclude ?? [];
          const want = exclude.length + 5;
          const found = await probeEntries(`ytsearch${want}:${spotify.search}`, want);
          if (isCanceled(id)) return id;
          const pick = found?.entries.find((e) => !e.upcoming && !exclude.includes(e.id));
          if (pick) {
            spotify.query = pick.url;
            req.matchedId = pick.id;
          } else if (exclude.length) {
            updateTask(id, { status: "error", error: "No other YouTube match found for this track." });
            return id;
          }
        }
        const link = spotify ? classifyLink("") : classifyLink(req.url);
        const kind = link.kind;
        const wholePlaylist = kind === "only" || kind === "mixed" && req.playlist === "all";
        if (wholePlaylist && link.needsLogin && !hasCookies()) {
          updateTask(id, { status: "error", error: "This list needs you to be signed in. Set a cookie source in Settings \u2192 Downloads." });
          return id;
        }
        const effectiveUrl = spotify?.query ?? (wholePlaylist && kind === "only" ? listUrl(link, req.limit) : req.url);
        if (wholePlaylist) updateTask(id, { sizeBytes: null, playlist: { index: 0, total: 0 } });
        if (req.audioTracks?.length && !req.audioLang && !wholePlaylist) {
          const startOne = startHandlers.get("tasks:start");
          for (const lang of req.audioTracks) {
            startOne(null, {
              ...req,
              format: "MP3",
              audioQuality: "best",
              videoQuality: void 0,
              audioTracks: void 0,
              subs: void 0,
              audioLang: lang,
              playlist: "single",
              approxSizeBytes: null,
              thumbnailUrl: req.thumbnailUrl ?? null
            }).catch(() => {
            });
          }
        }
        if (spotify) {
          updateTask(id, { label: spotify.label, experimentalMatch: "YT Match (Experimental)" });
          const e = tasks.get(id);
          if (e) e.spotify = { artist: spotify.artist, title: spotify.title };
        }
        if (!wholePlaylist && (req.approxSizeBytes == null || !req.thumbnailUrl)) {
          probeInfo(req).then((info) => {
            const entry2 = tasks.get(id);
            if (!entry2) return;
            const patch = {};
            if (entry2.state.sizeIsEstimate && info.approxSizeBytes != null) patch.sizeBytes = info.approxSizeBytes;
            if (!entry2.state.thumbnailUrl && info.thumbnailUrl) patch.thumbnailUrl = info.thumbnailUrl;
            if (Object.keys(patch).length) updateTask(id, patch);
          });
        }
        const outDirTemplate = destDir.replace(/%/g, "%%");
        const limitArgs = wholePlaylist && req.limit && link.type !== "search" ? ["--playlist-end", String(req.limit)] : [];
        const fileTemplate = req.audioLang ? "%(title)s [%(language)s].%(ext)s" : "%(title)s.%(ext)s";
        const args = wholePlaylist ? [
          ...ytdlpBaseArgs(),
          ...formatArgs(req),
          "--newline",
          "--yes-playlist",
          ...limitArgs,
          // One unavailable/private video shouldn't abort the other 99.
          "--ignore-errors",
          "-o",
          path2.join(outDirTemplate, "%(playlist_title|Playlist)s", "%(playlist_index)03d - %(title)s.%(ext)s"),
          "--",
          effectiveUrl
        ] : [
          ...ytdlpBaseArgs(),
          ...formatArgs(req),
          "--newline",
          "--no-playlist",
          "-o",
          path2.join(outDirTemplate, fileTemplate),
          "--",
          effectiveUrl
        ];
        const auth = protectUrlCredentials(effectiveUrl);
        args.splice(-2, 2, ...auth.tail);
        args.unshift(...auth.args);
        await downloadPool.acquire();
        const slotEntry = tasks.get(id);
        if (!slotEntry || isCanceled(id)) {
          downloadPool.release();
          auth.cleanup();
          return id;
        }
        let slotReleased = false;
        slotEntry.releaseSlot = () => {
          if (!slotReleased) {
            slotReleased = true;
            downloadPool.release();
          }
        };
        let child;
        try {
          child = spawn(ytdlpCommand(), args);
          child.on("close", auth.cleanup);
          child.on("error", auth.cleanup);
          attachLog(child, id);
        } catch (err) {
          auth.cleanup();
          updateTask(id, { status: "error", error: `Failed to start yt-dlp: ${err.message}` });
          return id;
        }
        const entry = tasks.get(id);
        entry.child = child;
        updateTask(id, { status: "running" });
        let stderrTail = "";
        let skipped = 0;
        const files = /* @__PURE__ */ new Set();
        let stdoutBuf = "";
        let streamBase = 0;
        let streamSize = 0;
        const isVideoFormat = Object.hasOwn(VIDEO_EXT, req.format);
        child.stdout.on("data", (chunk) => {
          stdoutBuf += chunk.toString();
          const lines = stdoutBuf.split(/\r?\n/);
          stdoutBuf = lines.pop() ?? "";
          for (const line of lines) {
            const item = line.match(/\[download\] Downloading (?:item|video) (\d+) of (\d+)/);
            if (item && wholePlaylist) {
              updateTask(id, { playlist: { index: Number(item[1]), total: Number(item[2]) } });
              continue;
            }
            const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
              const pct = Math.min(1, Number(match[1]) / 100);
              const pl = entry.state.playlist;
              if (wholePlaylist && pl?.total) {
                const overall = (Math.max(0, pl.index - 1) + pct) / pl.total;
                updateTask(id, { progress: Math.max(entry.state.progress, Math.min(0.999, overall)) });
              } else if (!wholePlaylist) {
                const sizeMatch = line.match(/of\s+~?\s*([\d.]+)\s*(B|KiB|MiB|GiB)/);
                if (sizeMatch) streamSize = Number(sizeMatch[1]) * { B: 1, KiB: 1024, MiB: 1048576, GiB: 1073741824 }[sizeMatch[2]];
                const doneBytes = streamBase + pct * streamSize;
                const known = Math.max(entry.state.sizeIsEstimate ? entry.state.sizeBytes ?? 0 : 0, streamBase + streamSize);
                const total = known > streamBase + streamSize ? known : streamBase + streamSize * (streamBase === 0 && isVideoFormat ? 1.1 : 1);
                updateTask(id, { progress: Math.min(0.99, total > 0 ? doneBytes / total : pct) });
              }
            }
            const subFile = req.subs?.only ? line.match(/Writing video subtitles to:\s+(.+)$/) : null;
            if (subFile) {
              entry.finalPath = subFile[1].trim().replace(/\.[^./\\]+$/, ".srt");
              files.add(entry.finalPath);
              updateTask(id, { label: path2.basename(entry.finalPath) });
            }
            if (/^\[download\] Destination:/.test(line) && streamSize > 0) {
              streamBase += streamSize;
              streamSize = 0;
            }
            const dest = line.match(/(?:Destination|Merging formats into):?\s+"?([^"\n]+)"?/);
            if (dest && !req.subs?.only) {
              entry.finalPath = dest[1].trim();
              files.add(entry.finalPath);
              updateTask(id, { label: path2.basename(entry.finalPath) });
            }
          }
        });
        child.stderr.on("data", (chunk) => {
          const text = chunk.toString();
          stderrTail = (stderrTail + text).slice(-2e3);
          skipped += (text.match(/^ERROR:/gm) ?? []).length;
        });
        child.on("error", (err) => {
          updateTask(id, { status: "error", error: `yt-dlp not found on PATH (${err.message})` });
        });
        child.on("close", (code, signal) => {
          if (!tasks.has(id)) return;
          if (entry.state.status === "canceled" || entry.state.status === "error") return;
          const partial = wholePlaylist && !signal && code === 1 && files.size > 0;
          if (signal || code !== 0 && !partial) {
            updateTask(id, {
              status: "error",
              error: stripLinkLogin(stderrTail.trim().split("\n").pop() ?? "") || `yt-dlp exited with code ${code}`
            });
            return;
          }
          let realSize = null;
          if (wholePlaylist) {
            let total = 0;
            for (const f of files) {
              try {
                total += fs2.statSync(f).size;
              } catch {
              }
            }
            realSize = total || null;
          } else {
            try {
              if (entry.finalPath) realSize = fs2.statSync(entry.finalPath).size;
            } catch {
            }
          }
          const pl = entry.state.playlist;
          updateTask(id, {
            status: "done",
            progress: 1,
            ...partial && pl?.total ? { label: `${pl.total - skipped}/${pl.total} downloaded \u2014 ${skipped} skipped (unavailable)` } : {},
            ...realSize != null ? { sizeBytes: realSize, sizeIsEstimate: false } : {}
          });
        });
        return id;
      });
      function probeEntries(rawUrl, limit) {
        const link = classifyLink(rawUrl);
        const url = link.kind === "only" ? listUrl(link, limit) : rawUrl;
        return new Promise((resolve) => {
          let child;
          const auth = protectUrlCredentials(url);
          try {
            child = spawn(ytdlpCommand(), [...ytdlpBaseArgs(), ...auth.args, "--flat-playlist", "--dump-single-json", "--no-warnings", "--playlist-end", String(limit), ...auth.tail]);
          } catch {
            auth.cleanup();
            resolve(null);
            return;
          }
          child.on("close", auth.cleanup);
          child.on("error", auth.cleanup);
          let out = "";
          const timer = setTimeout(() => child.kill(), 6e4);
          child.stdout.on("data", (c) => {
            out += c;
          });
          child.on("error", () => {
            clearTimeout(timer);
            resolve(null);
          });
          child.on("close", () => {
            clearTimeout(timer);
            try {
              const info = JSON.parse(out);
              if (info._type !== "playlist" || !Array.isArray(info.entries)) return resolve(null);
              const entries = info.entries.filter((e) => e && typeof e.id === "string").map((e) => ({
                id: e.id,
                upcoming: e.live_status === "is_upcoming",
                url: parseHttpUrl(e.url) ? e.url : parseHttpUrl(e.webpage_url) ? e.webpage_url : `https://www.youtube.com/watch?v=${e.id}`
              }));
              resolve({ title: info.title ?? "Subscription", entries });
            } catch {
              resolve(null);
            }
          });
        });
      }
      return { SPOTIFY_TRACK_RE, SPOTIFY_OTHER_RE, resolveSpotifyTrack, AUDIO_EXT, VIDEO_EXT, qualityLabel, subtitleArgs, embedArgs, formatArgs, YT_HOST_RE, CHANNEL_PATH_RE, classifyLink, listUrl, probePlaylist, probeInfo, extraInfo, LANG_RE, validateDownloadRequest, formatSize, bestAudioFormat, bestVideoFormat, estimateSize, probeEntries };
    }
    var THUMB_MIN_WIDTH = 160;
    function pickSmallThumbnail(thumbnails, fallback = null) {
      const list = (Array.isArray(thumbnails) ? thumbnails : []).filter((t) => t && typeof t.url === "string" && /^https?:\/\//i.test(t.url) && Number(t.width) > 0);
      const big = list.filter((t) => t.width >= THUMB_MIN_WIDTH).sort((a, b) => a.width - b.width)[0];
      if (big) return big.url;
      const small = list.sort((a, b) => b.width - a.width)[0];
      return small ? small.url : fallback;
    }
    module2.exports = { createDownload, pickSmallThumbnail, protectUrlCredentials };
  }
});

// .bundle-src.cjs
var path = require("node:path");
var os = require("node:os");
var fs = require("node:fs");
var readline = require("node:readline");
var DATA = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "omarchy-opnduck");
var OUT = path.join(os.homedir(), "Downloads", "OPNduck");
fs.mkdirSync(OUT, { recursive: true });
process.env.XDG_CONFIG_HOME = DATA;
var { createNodePlatform } = require_platform();
var { TOOLS, buildStartRequest } = require_mcp_tools();
var send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
var platform = createNodePlatform({ version: "0.1.0", scriptsDir: __dirname });
platform.paths.downloads = OUT;
platform.notify = () => true;
function createCore4(platform2) {
  const settings = require_settings();
  settings.configure(platform2);
  const { getSettings, ytdlpBaseArgs, hasCookies } = settings;
  const tools = require_tools().createTools(platform2);
  const engine = require_tasks().createTaskEngine({ platform: platform2, getSettings, onFinished: () => {
  } });
  const ctx = { platform: platform2, tools, getSettings, ytdlpBaseArgs, hasCookies, ...tools, ...engine, ...engine.pools, handleStart: (channel, fn) => engine.wrapStart(channel, fn) };
  const add = (create) => Object.assign(ctx, create(ctx));
  add(require_common().createCommon);
  add(require_convert().createConvert);
  add(require_trim().createTrim);
  add(require_gpu_jobs().createGpuJobs);
  add(require_compress().createCompress);
  add(require_download().createDownload);
  return {
    engine,
    startJob(channel, req) {
      const start = engine.startHandlers.get(channel);
      if (!start) throw new Error(`Unknown job: ${channel}`);
      return start(null, req);
    },
    shutdown() {
      for (const e of engine.tasks.values()) if (e.state.status === "queued" || e.state.status === "running") engine.killTask(e);
      engine.saveHistory();
    }
  };
}
var core = createCore4(platform);
core.engine.loadHistory();
core.engine.applyQueueLimits();
var CORE4 = /* @__PURE__ */ new Set(["download", "convert", "compress", "trim"]);
var paused = false;
function snapshot() {
  const tasks = [...core.engine.tasks.values()].map((t) => t.state).slice(-30).reverse().map((s) => ({
    id: String(s.id),
    kind: String(s.kind ?? ""),
    status: String(s.status ?? ""),
    progress: Math.max(0, Math.min(1, Number(s.progress) || 0)),
    label: String(s.label ?? "").slice(0, 120),
    error: String(s.error ?? "").slice(0, 200)
  }));
  send({ type: "tasks", tasks, paused });
}
platform.on("tasks:update", snapshot);
platform.on("queue:state", (q) => {
  paused = !!q.paused;
  snapshot();
});
async function handle(msg) {
  try {
    if (msg.cmd === "start") {
      if (!CORE4.has(msg.tool)) throw new Error("Unknown tool");
      const { channel, req } = buildStartRequest(msg.tool, msg.args);
      if (msg.tool === "download") {
        try {
          if (!/^https?:$/.test(new URL(req.url).protocol)) throw 0;
        } catch {
          throw new Error("Needs a full http(s) link");
        }
      } else if (!path.isAbsolute(req.inputPath) || !fs.statSync(req.inputPath).isFile()) throw new Error("File not found");
      await core.startJob(channel, req);
    } else if (msg.cmd === "cancel") core.engine.cancelTask(String(msg.id));
    else if (msg.cmd === "pause") core.engine.setQueuePaused(true);
    else if (msg.cmd === "resume") core.engine.setQueuePaused(false);
    else if (msg.cmd === "clear") core.engine.clearFinished();
    else if (msg.cmd === "reveal") core.engine.revealTask(String(msg.id));
    else if (msg.cmd === "folder") platform.openPath(OUT);
    snapshot();
  } catch (e) {
    send({ type: "error", message: String(e.message || e).slice(0, 200) });
  }
}
readline.createInterface({ input: process.stdin }).on("line", (l) => {
  try {
    handle(JSON.parse(l));
  } catch {
  }
}).on("close", () => {
  try {
    core.shutdown();
  } catch {
  }
  process.exit(0);
});
send({ type: "ready", tools: TOOLS.filter((t) => CORE4.has(t.name)).map((t) => t.name), outDir: OUT });
snapshot();
