import type { CreatorDossier } from "../../shared/contracts/core";
import { StatementList } from "./DossierStatements";

export function HealthNote({
  value,
}: {
  value: CreatorDossier["corpus"]["health"];
}) {
  return (
    <p className={`creator-study-health is-${value.status}`}>
      <span>
        {value.status === "full"
          ? "覆盖完整"
          : value.status === "partial"
            ? "部分覆盖"
            : "尚未覆盖"}
      </span>
      {value.reason}
    </p>
  );
}

export function InsightCard({
  data,
  title,
  values,
  empty,
}: {
  data: CreatorDossier;
  title: string;
  values: Parameters<typeof StatementList>[0]["values"];
  empty: string;
}) {
  return (
    <article className="creator-study-insight">
      <h3>{title}</h3>
      <StatementList data={data} values={values} empty={empty} />
    </article>
  );
}
