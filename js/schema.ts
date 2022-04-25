type Tag = string;

type FullCard = {
  tag: Tag;
  tags: { [tag: string]: any };
  template?: {
    params: {
      [key: string]: Tag;
    };
    defs: {
      [key: string]: TemplateDef;
    };
  };
};

type TemplateDef = {
  type: "tag_value";
  from: string;
  tag: Tag;
};

type Part = {
  actions: Action[];
};

type Action =
  | {
      type: "set_style";
      value: string;
      from: string;
    }
  | {
      type: "set_value";
      value: string;
      from: string;
    }
  | { type: "remove" };
