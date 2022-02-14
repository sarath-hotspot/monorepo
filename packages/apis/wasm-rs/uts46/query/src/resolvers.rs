use crate::w3::*;
use async_trait::async_trait;
use ethers::providers::{FromErr, Middleware};
use polywrap_wasm_rs::BigInt;
use thiserror::Error;
use idna::{domain_to_ascii, domain_to_unicode, Errors};

#[derive(Debug)]
pub struct QueryMiddleware<M>(M);

#[derive(Error, Debug)]
pub enum QueryMiddlewareError<M: Middleware> {
    #[error("{0}")]
    MiddlewareError(M::Error),
}

impl<M: Middleware> FromErr<M::Error> for QueryMiddlewareError<M> {
    fn from(src: M::Error) -> QueryMiddlewareError<M> {
        QueryMiddlewareError::MiddlewareError(src)
    }
}

#[async_trait]
impl<M> Middleware for QueryMiddleware<M>
    where
        M: Middleware,
{
    type Error = QueryMiddlewareError<M>;
    type Provider = M::Provider;
    type Inner = M;

    fn inner(&self) -> &M {
        &self.0
    }
}

impl<M> QueryMiddleware<M>
    where
        M: Middleware,
{
    pub async fn resolve_to_ascii(&self, input: InputToAscii) -> String {
        match domain_to_ascii(input.value) {
            Ok(result) => { result }
            Err(errMsg) => { panic!(errMsg) }
        }
    }

    pub async fn resolve_to_unicode(&self, input: InputToUnicode) -> String {
        match domain_to_unicode(input.value) {
            Ok(result) => { result }
            Err(errMsg) => { panic!(errMsg) }
        }
    }
}