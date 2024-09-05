import fs from "fs";
import { Parser } from "binary-parser";

const STEP_HEADER_LENGTH = 6;

const TempoChanges = new Parser()
	.endianness("little")
	.uint16("ticksPerSecond")
	.uint16("offsetCount")
	.uint16("tempoIgnoredParam")
	.array("timeOffsets", {
		type: "int32le",
		length: "offsetCount",
	})
	.array("data", {
		type: "int32le",
		length: "offsetCount",
	});

const Configurations = new Parser()
	.endianness("little")
	.uint16("configIgnoredParam1")
	.uint16("configCount")
	.uint16("configIgnoredParam2")
	.array("configOffsets", {
		type: "uint32le",
		length: "configCount",
	})
	.array("data", {
		type: "uint16le",
		length: "configCount",
	});

const StepsExtraData = new Parser().endianness("little").uint8("panels").uint8("type");

const Steps = new Parser().endianness("little").wrapped("buffer", {
	length: function (this: any, item) {
		return this.$parent.size - 6;
	},
	wrapper: (buffer) => buffer,
	type: new Parser()
		.endianness("little")
		.uint8("style")
		.uint8("difficulty")
		.uint16("stepCount")
		.uint16("stepsIgnoredParam")
		.array("measures", {
			type: "uint32le",
			length: "stepCount",
		})
		.array("steps", {
			type: "uint8",
			length: "stepCount",
		})
		.buffer("ignoresBufferBeforeExtraData", {
			readUntil: (item, buffer) => buffer[0] !== 0,
		})
		.array("stepsExtraData", {
			type: StepsExtraData,
			readUntil: "eof",
		}),
});
const Ignored = new Parser().endianness("little").seek("size");
const EndOfFile = new Parser().endianness("little").array("end", {
	type: "uint8",
	readUntil: "eof",
});

const Chunk = new Parser()
	.useContextVars()
	.endianness("little")
	.uint32("size")
	.uint16("chunkType")
	.choice("content", {
		tag: "chunkType",
		choices: {
			0: EndOfFile, // Hacky way to ignore end of file, probably
			1: TempoChanges, // TempoChanges
			2: Configurations, // Configurations
			3: Steps, // Steps
			4: Ignored, // Background
			5: Ignored, // Unknown
			9: Ignored, // SongMetadata
		},
	});

const ssqFile = new Parser().endianness("little").useContextVars().array("chunks", {
	type: Chunk,
	readUntil: "eof",
});

const fileContent = fs.readFileSync("maxx.ssq", "utf-8");
const byteArray = new Uint8Array(
	fileContent
		.split(/\s/)
		.flatMap((str) => [parseInt(str.substring(0, 2), 16), parseInt(str.substring(2, 4), 16)])
);
console.log(JSON.stringify(ssqFile.parse(byteArray)));
//ssqFile.parse(byteArray);
