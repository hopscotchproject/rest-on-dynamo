# GET
* 200
* 400 - key schema violation
* 404
* 500

# HEAD
* 204 - no content
* 400 - key schema violation
* 404
* 500

# POST
* 201 - created
* 400 - key schema violation
* 409 - key schema conflict
* 500

# PUT
* 200
* 400 - key schema violation
* 404 - key does not exist
* 500

# DELETE
* 204
* 500

# PATCH
* 200
* 400 - key schema violation
* 404 - key does not exist
* 500

