# loopback-component-cascade

[![Build Status](https://travis-ci.com/loopback4/loopback-component-cascade.svg?branch=master)](https://travis-ci.com/loopback4/loopback-component-cascade)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Floopback4%2Floopback-component-cascade.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Floopback4%2Floopback-component-cascade?ref=badge_shield)

Using this simple extension you can cascade models create, update, delete in repository level.

---

## Installation

```bash
npm i --save loopback-component-cascade
```

---

## Usage

### Cascade Repository Mixin

Change your repository parent class from `DefaultCrudRepository` to `CascadeRepositoryMixin()()`

#### Example

Change your repository from:

```ts
export class UserRepository extends DefaultCrudRepository<
    User,
    typeof User.prototype.id,
    UserRelations
> {
    // ...
}
```

To:

```ts
import { CascadeRepositoryMixin } from "loopback-component-cascade";

export class UserRepository extends CascadeRepositoryMixin<
    User,
    string,
    UserRelations
>()() {
    // ...
}
```

---

## Contributions

-   [KoLiBer](https://www.linkedin.com/in/mohammad-hosein-nemati-665b1813b/)

## License

This project is licensed under the [MIT license](LICENSE).  
Copyright (c) KoLiBer (koliberr136a1@gmail.com)


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Floopback4%2Floopback-component-cascade.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Floopback4%2Floopback-component-cascade?ref=badge_large)