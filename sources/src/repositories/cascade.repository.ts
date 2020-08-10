import { MixinTarget } from "@loopback/core";
import { InvocationContext } from "@loopback/context";
import {
    DefaultCrudRepository,
    DataObject,
    Options,
    Entity,
    Where,
    Filter,
} from "@loopback/repository";

export interface CascadeOptions extends Options {
    filter?: Filter<any>;
}

/**
 * This interface contains additional types added to CascadeRepositoryMixin type
 */
export interface CascadeRepository<
    T extends Entity,
    ID,
    Relations extends object = {}
> {}

/**
 *  +--------+
 *  | create |
 *  +----+---+
 *       |
 *       |
 *  +----v------+
 *  | createAll |
 *  +-----------+
 *
 *
 *  +--------+    +------------+   +-------------+
 *  | update |    | updateById |   | replaceById |
 *  +----+---+    +-----+------+   +-------+-----+
 *       |              |                  |
 *       |              |                  |
 *       |        +-----v-----+            |
 *       +--------> updateAll <------------+
 *                +-----------+
 *
 *
 *  +--------+    +------------+
 *  | delete |    | deleteById |
 *  +--+-----+    +------+-----+
 *     |                 |
 *     |                 |
 *     |  +-----------+  |
 *     +--> deleteAll <--+
 *        +-----------+
 */
/**
 * Cascade repository mixin, add Create, Update, Delete operations supporting Cascade
 */
export function CascadeRepositoryMixin<
    T extends Entity,
    ID,
    Relations extends object = {}
>() {
    return function <
        R extends MixinTarget<DefaultCrudRepository<T, ID, Relations>>
    >(superClass: R) {
        class MixedRepository extends superClass
            implements CascadeRepository<T, ID, Relations> {
            /**
             * result = Create parents
             * result = map(find related entity)
             * for each entity relations
             *      children = map(result[relation])
             *      children = flat(1)
             *      children = map({...entity, [keyFrom]: keyTo})
             *      result = target.createAll(children, options)
             * return result
             */
            createAll = async (
                entities: DataObject<T & Relations>[],
                options?: CascadeOptions
            ) => {
                // remote navigational properties
                const rawEntities = entities.map<any>((entity) =>
                    Object.fromEntries(
                        Object.entries(entity).filter(
                            ([_, value]) => typeof value !== "object"
                        )
                    )
                );

                let result = await super.createAll(rawEntities, options);

                result = result.map((model) => {
                    // find entity for each result and bind together
                    const entity = entities.reduce<DataObject<T> | undefined>(
                        (accumulate, entity) => {
                            const checkableProperties = Object.entries(
                                this.entityClass.definition.properties
                            )
                                .filter(([key, value]) => {
                                    if (value.id) {
                                        return false;
                                    }

                                    if (key in entity) {
                                        return true;
                                    }

                                    if (
                                        "default" in value ||
                                        "defaultFn" in value
                                    ) {
                                        return false;
                                    }

                                    return true;
                                })
                                .map(([key, _]) => key);

                            const equals = checkableProperties.reduce<boolean>(
                                (accumulate, property) => {
                                    return (
                                        accumulate &&
                                        (entity as any)[property] ===
                                            (model as any)[property]
                                    );
                                },
                                true
                            );

                            if (equals) {
                                return entity;
                            } else {
                                return accumulate;
                            }
                        },
                        undefined
                    );

                    // model where found
                    // map entity relations and add parent keyFrom, keyTo
                    if (entity) {
                        for (let [relation, metadata] of Object.entries(
                            this.entityClass.definition.relations
                        )) {
                            const keyTo = (metadata as any).keyTo;
                            const keyFrom = (metadata as any).keyFrom;

                            if (metadata.targetsMany) {
                                (model as any)[relation] =
                                    (entity as any)[relation] &&
                                    (entity as any)[relation].map(
                                        (entityItem: any) => ({
                                            ...entityItem,
                                            [keyTo]: (model as any)[keyFrom],
                                        })
                                    );
                            } else {
                                (model as any)[relation] = (entity as any)[
                                    relation
                                ] && {
                                    ...(entity as any)[relation],
                                    [keyTo]: (model as any)[keyFrom],
                                };
                            }
                        }
                    }

                    return model;
                });

                console.log(result);

                for (let [relation, metadata] of Object.entries(
                    this.entityClass.definition.relations
                )) {
                    const keyTo = (metadata as any).keyTo;
                    const keyFrom = (metadata as any).keyFrom;

                    const children = entities
                        .map((entity: any) => entity[relation])
                        .flat(1)
                        .filter((entity) => entity);

                    // const childrenResult = await this.createAll(
                    //     children,
                    //     options
                    // );

                    // result = result.map((entity: any) => {
                    //     if (metadata.targetsMany) {
                    //         entity[relation] = childrenResult.filter(
                    //             (child: any) => child[keyFrom] === entity[keyTo]
                    //         );
                    //     } else {
                    //         entity[relation] = childrenResult.filter(
                    //             (child: any) => child[keyFrom] === entity[keyTo]
                    //         );
                    //     }

                    //     return entity;
                    // });
                }

                return result;
            };

            /**
             * Cascade create() using createAll()
             */
            create = async (
                entity: DataObject<T & Relations>,
                options?: CascadeOptions
            ) => {
                const result = await this.createAll([entity], options);

                return result[0];
            };

            /**
             * Cascade where and update all entities
             */
            updateAll = async (
                data: DataObject<T & Relations>,
                where?: Where<T>,
                options?: CascadeOptions
            ) => {
                const CascadeContext = new InvocationContext(
                    undefined as any,
                    this,
                    "update",
                    Array.from(arguments)
                );

                return await super.updateAll(data, where, options);
            };

            /**
             * Cascade updateById() using updateAll()
             */
            updateById = async (
                id: ID,
                data: DataObject<T & Relations>,
                options?: CascadeOptions
            ) => {
                await this.updateAll(
                    data,
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };

            /**
             * Cascade update() using updateAll()
             */
            update = async (
                entity: T & Relations,
                options?: CascadeOptions
            ) => {
                await this.updateAll(
                    entity,
                    this.entityClass.buildWhereForId(
                        this.entityClass.getIdOf(entity)
                    ),
                    options
                );
            };

            /**
             * Cascade replaceById() using updateAll()
             */
            replaceById = async (
                id: ID,
                data: DataObject<T & Relations>,
                options?: CascadeOptions
            ) => {
                await this.updateAll(
                    {
                        ...Object.fromEntries(
                            Object.entries(
                                this.entityClass.definition.properties
                            ).map(([key, _]) => [key, undefined])
                        ),
                        ...data,
                    },
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };

            /**
             * Select parents by where and filter.where
             * result = delete parents by where and filter.where
             * for each entity relations
             *      where = {[keyFrom]: {inq: parents[keyTo]}}
             *      filter = filter.include[relation].scope
             *      result += target.deleteAll(where, {...options, filter})
             * return result
             */
            deleteAll = async (where?: Where<T>, options?: CascadeOptions) => {
                where = {
                    and: [where, options?.filter?.where].filter(
                        (condition) => condition
                    ),
                } as any;

                const parents = await super.find({ where: where }, options);

                let result = await super.deleteAll(where, options);

                for (const [relation, metadata] of Object.entries(
                    this.entityClass.definition.relations
                )) {
                    const childrenWhere = {
                        [(metadata as any).keyTo]: {
                            inq: parents.map(
                                (item: any) => item[(metadata as any).keyFrom]
                            ),
                        },
                    };
                    const childrenFilter = (
                        options?.filter?.include || []
                    ).reduce(
                        (accumulate: any, item) =>
                            item.relation === relation
                                ? item.scope
                                : accumulate,
                        undefined
                    );

                    if (childrenWhere && childrenFilter && childrenWhere) {
                        // result.count += (
                        //     await super.deleteAll(itemsWhere, {
                        //         ...options,
                        //         filter: itemsFilter,
                        //     })
                        // ).count;
                    }
                }

                return result;
            };

            /**
             * Cascade delete() using deleteAll()
             */
            delete = async (entity: T, options?: CascadeOptions) => {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(
                        this.entityClass.getIdOf(entity)
                    ),
                    options
                );
            };

            /**
             * Cascade deleteById() using deleteAll()
             */
            deleteById = async (id: ID, options?: CascadeOptions) => {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(id),
                    options
                );
            };
        }

        return MixedRepository;
    };
}
