import { z } from "zod";
import {
  contentPackageSchema, contentPackageSnapshotSchema, platformVariantSchema, publicationRunSchema
} from "./creation";
import {
  creationHypothesisSchema, knowledgeBindingLineageSchema, practiceValidationSchema
} from "./knowledge";

export const contentPackageLineageSchema = z.object({
  package: contentPackageSchema,
  snapshot: contentPackageSnapshotSchema,
  bindings: z.array(knowledgeBindingLineageSchema),
  hypotheses: z.array(creationHypothesisSchema),
  variants: z.array(platformVariantSchema),
  publications: z.array(z.object({
    run: publicationRunSchema,
    validations: z.array(practiceValidationSchema)
  })),
  readiness: z.object({
    readyForPublication: z.boolean(),
    blockers: z.array(z.string())
  })
});

export type ContentPackageLineage = z.infer<typeof contentPackageLineageSchema>;
