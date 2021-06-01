import { EmptyObject } from "../../../../../utils/types";
import { ConverterFunction } from "../../common/types";
import p, { PrudenceSchema } from "prudence";
import {
    InvalidScoreFailure,
    KTDataNotFoundFailure,
} from "../../../framework/common/converter-failures";
import { FormatPrError } from "../../../../../utils/prudence";
import { ARCDDRScore } from "./types";
import { FindChartOnARCID } from "../../../../../utils/queries/charts";
import { FindSongOnIDGuaranteed } from "../../../../../utils/queries/songs";
import { DryScore } from "../../../framework/common/types";
import {
    GenericGetGradeAndPercent,
    ParseDateFromString,
} from "../../../framework/common/score-utils";
import { Lamps } from "kamaitachi-common";

// There's a bunch of other useless fields but we don't care
const PR_ArcDDRScore: PrudenceSchema = {
    chart_id: "string",
    lamp: p.isIn(
        "MARVELOUS_FC",
        "PERFECT_FC",
        "GREAT_FC",
        "GOOD_FC",
        "CLEAR_3LIFE",
        "CLEAR",
        "FAIL"
    ),
    score: p.isBoundedInteger(0, 1_000_000),
    ex_score: p.isPositiveInteger,
    max_combo: p.isPositiveInteger,
    judgements: {
        marvelous: p.isPositiveInteger,
        perfect: p.isPositiveInteger,
        great: p.isPositiveInteger,
        good: p.isPositiveInteger,
        boo: p.isPositiveInteger,
        miss: p.isPositiveInteger,
        ok: p.isPositiveInteger,
        ng: p.isPositiveInteger,
    },
    fast: p.isPositiveInteger,
    slow: p.isPositiveInteger,
    timestamp: "string",
};

export const ConvertAPIArcDDR: ConverterFunction<unknown, EmptyObject> = async (
    data,
    context,
    importType,
    logger
) => {
    const err = p(data, PR_ArcDDRScore, {}, { throwOnNonObject: false, allowExcessKeys: true });

    if (err) {
        throw new InvalidScoreFailure(FormatPrError(err, "Invalid ARC Score: "));
    }

    // confirmed by Prudence above.
    const score = data as ARCDDRScore;

    const chart = await FindChartOnARCID("ddr", score.chart_id);

    if (!chart) {
        throw new KTDataNotFoundFailure(
            `Could not find chart with chart_id ${score.chart_id}.`,
            importType,
            data,
            context
        );
    }

    const song = await FindSongOnIDGuaranteed("ddr", chart.songID, logger);

    const { grade, percent } = GenericGetGradeAndPercent("ddr", score.ex_score, chart);

    const timeAchieved = ParseDateFromString(score.timestamp);

    const lamp = ResolveARCDDRLamp(score.lamp);

    const dryScore: DryScore<"ddr:SP" | "ddr:DP"> = {
        comment: null,
        game: "ddr",
        importType,
        timeAchieved,
        service: "ARC DDR Ace",
        scoreData: {
            grade,
            percent,
            score: score.ex_score,
            hitData: {
                marvelous: score.judgements.marvelous,
                perfect: score.judgements.perfect,
                great: score.judgements.great,
                good: score.judgements.good,
                boo: score.judgements.boo,
                miss: score.judgements.miss,
                ok: score.judgements.ok,
                ng: score.judgements.ng,
            },
            hitMeta: {
                fast: score.fast,
                slow: score.slow,
                maxCombo: score.max_combo,
            },
            lamp,
        },
        scoreMeta: {},
    };

    return { song, chart, dryScore };
};

function ResolveARCDDRLamp(lamp: ARCDDRScore["lamp"]): Lamps["ddr:SP" | "ddr:DP"] {
    switch (lamp) {
        case "FAIL":
            return "FAILED";
        case "CLEAR":
            return "CLEAR";
        case "CLEAR_3LIFE":
            return "LIFE4";
        case "GREAT_FC":
            return "GREAT FULL COMBO";
        case "PERFECT_FC":
            return "PERFECT FULL COMBO";
    }

    throw new InvalidScoreFailure(`Invalid lamp ${lamp} - Could not resolve.`);
}
