export type ChatAgentSuggestionCard = {
  cardName: string;
  cardDesc: string;
};

/** DataWorks /chatagent welcome suggestion cards (cardName on card, cardDesc → composer placeholder). */
export const CHATAGENT_SUGGESTION_CARDS: readonly ChatAgentSuggestionCard[] = [
  {
    cardName: "SQL开发辅助",
    cardDesc: "针对输入的SQL语句进行解释、注释、纠错、优化",
  },
  {
    cardName: "元数据智能服务",
    cardDesc: "元数据补全纠错",
  },
  {
    cardName: "指标口径问答",
    cardDesc: "支持对指标口径进行问答",
  },
  {
    cardName: "开发规范问答",
    cardDesc:
      "针对数据中台开发规范知识（包括SQL开发规范、数据模型命名规范等）进行回答",
  },
  {
    cardName: "智能建模",
    cardDesc: "根据数据建模需求生成模型DDL",
  },
  {
    cardName: "字段标准映射稽核",
    cardDesc: "字段标准映射",
  },
  {
    cardName: "字段标准生成",
    cardDesc: '{"fieldLable":"渠道类型"}',
  },
  {
    cardName: "程序上线检查",
    cardDesc: "检查程序是否符合数据开发规范",
  },
  {
    cardName: "语义找表",
    cardDesc: "支持根据用户查找数据表、字段在哪个数据表等问题返回符合的数据表信息",
  },
  {
    cardName: "SQL生成",
    cardDesc: "支持根据用户查询、统计数据的问题生成对应SQL语句",
  },
] as const;
