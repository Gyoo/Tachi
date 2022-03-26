import { Router } from "express";
import db from "external/mongo/db";
import { SYMBOL_TachiAPIAuth } from "lib/constants/tachi";
import { ExpressWrappedScoreImportMain } from "lib/score-import/framework/express-wrapper";
import { PR_LR2Hook } from "lib/score-import/import-types/ir/lr2hook/parser";
import { LR2HookScore } from "lib/score-import/import-types/ir/lr2hook/types";
import { RequirePermissions } from "server/middleware/auth";
import prValidate from "server/middleware/prudence-validate";
import { UpdateClassIfGreater } from "utils/class";

const router: Router = Router({ mergeParams: true });

router.use(RequirePermissions("submit_score"));

/**
 * Import a score in the LR2Hook Format.
 *
 * @name POST /ir/lr2hook/import
 */
router.post("/import", async (req, res) => {
	const importRes = await ExpressWrappedScoreImportMain(
		req[SYMBOL_TachiAPIAuth].userID!,
		false,
		"ir/lr2hook",
		[req.body]
	);

	return res.status(importRes.statusCode).json(importRes.body);
});

/**
 * Import a course in the LR2Hook format.
 *
 * @name POST /ir/lr2hook/import/course
 */
router.post("/import/course", prValidate(PR_LR2Hook), async (req, res) => {
	// notably, courses in LR2 are actually identical to scores. They have all
	// the same fields in all the same ways. The only significant difference is that
	// the md5 field is 4 fields conjoined, rather than just one.
	const score: LR2HookScore = req.body;

	if (score.scoreData.notesPlayed !== score.scoreData.notesTotal) {
		return res.status(200).json({
			success: true,
			description: `Class not updated. You failed to clear this course.`,
			body: {
				notesPlayed: score.scoreData.notesPlayed,
				notesTotal: score.scoreData.notesTotal,
			},
		});
	}

	const course = await db["bms-course-lookup"].findOne({
		md5sums: score.md5,
	});

	if (!course) {
		return res.status(404).json({
			success: false,
			description: `Couldn't find a course with this MD5 (${score.md5}).`,
		});
	}

	const userID = req[SYMBOL_TachiAPIAuth]!.userID!;

	const result = await UpdateClassIfGreater(
		userID,
		"bms",
		course.playtype,
		course.set,
		course.value
	);

	if (result === false) {
		return res.status(200).json({
			success: true,
			description: "Class not updated.",
			body: {
				set: course.set,
				value: course.value,
			},
		});
	}

	return res.status(200).json({
		success: true,
		description: "Successfully updated class.",
		body: {
			set: course.set,
			value: course.value,
		},
	});
});

export default router;
