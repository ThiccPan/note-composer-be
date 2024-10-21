type User = {
  id: string;
  username: string;
  email: string;
}

type Note = {
  id: string;
  title: string;
  content: string;
  tags?: Tag[];
}

type Tag = {
  id: string;
  value: string;
}

export type { User, Note, Tag }