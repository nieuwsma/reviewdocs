# Data model

This demonstration uses an object persisted as JSON in local storage, rather than relational tables. `revisions` is an ordered array of version/text records. `approvedVersion` is null or the current version. Earlier text is retained in immutable history.

A relational ERD is inapplicable here. The toolkit's optional disposable-database adapter and full-graph viewer serve products with relational stores; no database proof is claimed by this example.
